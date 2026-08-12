import crypto from "node:crypto";
import { StatusCodes } from "http-status-codes";

import type { UserRole } from "@/config/roles";
import { audit, type RequestContext } from "@/lib/audit";
import { comparePassword, hashPassword, signAccessToken, signRefreshToken, verifyRefreshToken } from "@/lib/auth";
import { isCloudinaryConfigured, uploadAvatarBuffer } from "@/lib/cloudinary";
import { sanitizeText } from "@/lib/sanitize";
import type { AuthenticatedUser } from "@/lib/types";
import { emailService } from "@/services/email.service";
import { logger } from "@/utils/logger";
import { prisma } from "@/utils/prisma";
import { ServiceResponse } from "@/utils/serviceResponse";
import type {
	ChangePasswordInput,
	ForgotPasswordInput,
	LoginInput,
	RefreshInput,
	ResetPasswordInput,
	UpdateProfileInput,
} from "./auth.validation";

function toAuthenticatedUser(user: {
	id: string;
	name: string;
	email: string;
	role: string;
	avatar?: string | null;
}): AuthenticatedUser {
	return {
		id: user.id,
		name: user.name,
		email: user.email,
		role: user.role as UserRole,
		avatar: user.avatar ?? null,
	};
}

interface AuthTokens {
	accessToken: string;
	refreshToken: string;
}

async function createTokens(userId: string, role: string): Promise<AuthTokens> {
	const tokenId = crypto.randomUUID();
	const refreshToken = signRefreshToken(userId, tokenId);
	const tokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");

	await prisma.refreshToken.create({
		data: {
			tokenHash,
			userId,
			expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
		},
	});

	return {
		accessToken: signAccessToken(userId, role),
		refreshToken,
	};
}

/** Empty context used by call sites (e.g. background/test) that don't have a request to read IP/UA from. */
const noContext: RequestContext = { ip: null, userAgent: null };

export const authService = {
	async login(
		input: LoginInput,
		ctx: RequestContext = noContext,
	): Promise<ServiceResponse<{ user: AuthenticatedUser; tokens: AuthTokens } | null>> {
		const user = await prisma.user.findUnique({ where: { email: input.email } });
		if (!user) {
			await audit({
				user: null,
				action: "auth.login_failed",
				category: "auth",
				message: `Failed login attempt for unknown email ${input.email}`,
				metadata: { email: input.email, reason: "unknown_email" },
				ip: ctx.ip,
				userAgent: ctx.userAgent,
			});
			return ServiceResponse.failure("Invalid email or password.", null, StatusCodes.UNAUTHORIZED);
		}

		if (user.status === "inactive") {
			await audit({
				user: toAuthenticatedUser(user),
				action: "auth.login_failed",
				category: "auth",
				message: `Login blocked for deactivated account (${user.email})`,
				metadata: { reason: "account_inactive" },
				ip: ctx.ip,
				userAgent: ctx.userAgent,
			});
			return ServiceResponse.failure(
				"This account has been deactivated. Contact an admin.",
				null,
				StatusCodes.FORBIDDEN,
			);
		}

		const valid = await comparePassword(input.password, user.passwordHash);
		if (!valid) {
			await audit({
				user: toAuthenticatedUser(user),
				action: "auth.login_failed",
				category: "auth",
				message: `Failed login attempt for ${user.email} (wrong password)`,
				metadata: { reason: "wrong_password" },
				ip: ctx.ip,
				userAgent: ctx.userAgent,
			});
			return ServiceResponse.failure("Invalid email or password.", null, StatusCodes.UNAUTHORIZED);
		}

		const tokens = await createTokens(user.id, user.role);
		await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

		await audit({
			user: toAuthenticatedUser(user),
			action: "auth.login",
			category: "auth",
			message: `${user.name} signed in`,
			ip: ctx.ip,
			userAgent: ctx.userAgent,
		});

		return ServiceResponse.success("Signed in successfully.", {
			user: toAuthenticatedUser(user),
			tokens,
		});
	},

	async refresh(input: RefreshInput): Promise<ServiceResponse<AuthTokens | null>> {
		try {
			const payload = verifyRefreshToken(input.refreshToken);
			const tokenHash = crypto.createHash("sha256").update(input.refreshToken).digest("hex");

			const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });
			if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
				return ServiceResponse.failure("Invalid or expired refresh token.", null, StatusCodes.UNAUTHORIZED);
			}

			await prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });

			const user = await prisma.user.findUnique({ where: { id: payload.userId } });
			if (!user) {
				return ServiceResponse.failure("User not found.", null, StatusCodes.UNAUTHORIZED);
			}
			if (user.status === "inactive") {
				return ServiceResponse.failure("This account has been deactivated.", null, StatusCodes.FORBIDDEN);
			}

			const tokens = await createTokens(user.id, user.role);
			return ServiceResponse.success("Tokens refreshed.", tokens);
		} catch (err) {
			logger.error({ err }, "Refresh token verification failed");
			return ServiceResponse.failure("Invalid or expired refresh token.", null, StatusCodes.UNAUTHORIZED);
		}
	},

	async me(userId: string): Promise<ServiceResponse<AuthenticatedUser | null>> {
		const user = await prisma.user.findUnique({ where: { id: userId } });
		if (!user) {
			return ServiceResponse.failure("User not found.", null, StatusCodes.NOT_FOUND);
		}
		return ServiceResponse.success("Current user.", toAuthenticatedUser(user));
	},

	async updateProfile(
		userId: string,
		input: UpdateProfileInput,
		ctx: RequestContext = noContext,
	): Promise<ServiceResponse<AuthenticatedUser | null>> {
		const user = await prisma.user.findUnique({ where: { id: userId } });
		if (!user) {
			return ServiceResponse.failure("User not found.", null, StatusCodes.NOT_FOUND);
		}

		const data: Record<string, unknown> = {};
		const prev: Record<string, unknown> = {};
		const next: Record<string, unknown> = {};

		if (input.name !== undefined) {
			const cleanName = sanitizeText(input.name);
			if (!cleanName) {
				return ServiceResponse.failure("Name cannot be empty.", null, StatusCodes.BAD_REQUEST);
			}
			if (cleanName !== user.name) {
				data.name = cleanName;
				prev.name = user.name;
				next.name = cleanName;
			}
		}
		if (input.email !== undefined && input.email !== user.email) {
			const existing = await prisma.user.findUnique({ where: { email: input.email } });
			if (existing && existing.id !== userId) {
				return ServiceResponse.failure("Email is already in use.", null, StatusCodes.CONFLICT);
			}
			data.email = input.email;
			prev.email = user.email;
			next.email = input.email;
		}

		if (Object.keys(data).length === 0) {
			return ServiceResponse.success("No changes made.", toAuthenticatedUser(user));
		}

		const updated = await prisma.user.update({
			where: { id: userId },
			data,
		});

		await audit({
			user: toAuthenticatedUser(updated),
			action: "profile.update",
			category: "profile",
			entityType: "user",
			entityId: userId,
			prevValue: prev,
			newValue: next,
			message: `${updated.name} updated their profile (${Object.keys(next).join(", ")})`,
			ip: ctx.ip,
			userAgent: ctx.userAgent,
		});

		return ServiceResponse.success("Profile updated.", toAuthenticatedUser(updated));
	},

	/**
	 * Uploads a pre-validated avatar image buffer (mimetype/size already checked by the
	 * multer middleware) to Cloudinary and persists the resulting URL. `userId` always comes
	 * from the verified access token (see requireAuth), never from client input, so this can
	 * only ever update the caller's own avatar.
	 */
	async uploadAvatar(
		userId: string,
		file: Express.Multer.File,
		ctx: RequestContext = noContext,
	): Promise<ServiceResponse<AuthenticatedUser | null>> {
		if (!isCloudinaryConfigured) {
			return ServiceResponse.failure(
				"Avatar uploads aren't configured on this server yet.",
				null,
				StatusCodes.SERVICE_UNAVAILABLE,
			);
		}

		const user = await prisma.user.findUnique({ where: { id: userId } });
		if (!user) {
			return ServiceResponse.failure("User not found.", null, StatusCodes.NOT_FOUND);
		}

		let avatarUrl: string;
		try {
			avatarUrl = await uploadAvatarBuffer(file.buffer, userId);
		} catch (err) {
			logger.error({ err }, "Cloudinary avatar upload failed");
			return ServiceResponse.failure("Failed to upload avatar. Please try again.", null, StatusCodes.BAD_GATEWAY);
		}

		const updated = await prisma.user.update({
			where: { id: userId },
			data: { avatar: avatarUrl },
		});

		await audit({
			user: toAuthenticatedUser(updated),
			action: "profile.avatar_update",
			category: "profile",
			entityType: "user",
			entityId: userId,
			message: `${updated.name} updated their profile photo`,
			ip: ctx.ip,
			userAgent: ctx.userAgent,
		});

		return ServiceResponse.success("Avatar updated.", toAuthenticatedUser(updated));
	},

	async changePassword(
		userId: string,
		input: ChangePasswordInput,
		ctx: RequestContext = noContext,
	): Promise<ServiceResponse<null>> {
		const user = await prisma.user.findUnique({ where: { id: userId } });
		if (!user) {
			return ServiceResponse.failure("User not found.", null, StatusCodes.NOT_FOUND);
		}

		const valid = await comparePassword(input.currentPassword, user.passwordHash);
		if (!valid) {
			return ServiceResponse.failure("Current password is incorrect.", null, StatusCodes.BAD_REQUEST);
		}

		const passwordHash = await hashPassword(input.newPassword);
		await prisma.user.update({
			where: { id: userId },
			data: { passwordHash },
		});

		await audit({
			user: toAuthenticatedUser(user),
			action: "auth.password_change",
			category: "auth",
			entityType: "user",
			entityId: userId,
			message: `${user.name} changed their password`,
			ip: ctx.ip,
			userAgent: ctx.userAgent,
		});

		return ServiceResponse.success("Password changed successfully.", null);
	},

	async forgotPassword(input: ForgotPasswordInput, ctx: RequestContext = noContext): Promise<ServiceResponse<null>> {
		const user = await prisma.user.findUnique({ where: { email: input.email } });
		if (!user) {
			// Deliberately no audit row here — an unknown email in a password-reset
			// request is not itself an activity worth attributing to any account.
			return ServiceResponse.success("If this email exists, a reset link has been sent.", null);
		}

		const resetToken = crypto.randomBytes(32).toString("hex");
		const resetExpires = new Date(Date.now() + 60 * 60 * 1000);

		await prisma.user.update({
			where: { id: user.id },
			data: { passwordResetToken: resetToken, passwordResetExpires: resetExpires },
		});

		await audit({
			user: toAuthenticatedUser(user),
			action: "auth.password_reset_requested",
			category: "auth",
			entityType: "user",
			entityId: user.id,
			message: `Password reset requested for ${user.email}`,
			ip: ctx.ip,
			userAgent: ctx.userAgent,
		});

		emailService.sendPasswordReset(user.email, resetToken).catch(() => {});
		return ServiceResponse.success("If this email exists, a reset link has been sent.", null);
	},

	async resetPassword(input: ResetPasswordInput, ctx: RequestContext = noContext): Promise<ServiceResponse<null>> {
		const user = await prisma.user.findFirst({
			where: {
				passwordResetToken: input.token,
				passwordResetExpires: { gt: new Date() },
			},
		});

		if (!user) {
			return ServiceResponse.failure("Invalid or expired reset token.", null, StatusCodes.BAD_REQUEST);
		}

		const passwordHash = await hashPassword(input.newPassword);
		await prisma.user.update({
			where: { id: user.id },
			data: { passwordHash, passwordResetToken: null, passwordResetExpires: null },
		});

		await prisma.refreshToken.updateMany({
			where: { userId: user.id, revokedAt: null },
			data: { revokedAt: new Date() },
		});

		await audit({
			user: toAuthenticatedUser(user),
			action: "auth.password_reset_completed",
			category: "auth",
			entityType: "user",
			entityId: user.id,
			message: `Password reset completed for ${user.email}`,
			ip: ctx.ip,
			userAgent: ctx.userAgent,
		});

		return ServiceResponse.success("Password reset successfully.", null);
	},

	async logout(refreshToken: string, ctx: RequestContext = noContext): Promise<ServiceResponse<null>> {
		const tokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");

		const stored = await prisma.refreshToken.findUnique({
			where: { tokenHash },
			include: { user: { select: { id: true, name: true, email: true, role: true, avatar: true } } },
		});

		await prisma.refreshToken.updateMany({
			where: { tokenHash, revokedAt: null },
			data: { revokedAt: new Date() },
		});

		if (stored?.user) {
			await audit({
				user: toAuthenticatedUser(stored.user),
				action: "auth.logout",
				category: "auth",
				entityType: "user",
				entityId: stored.user.id,
				message: `${stored.user.name} signed out`,
				ip: ctx.ip,
				userAgent: ctx.userAgent,
			});
		}

		return ServiceResponse.success("Signed out successfully.", null);
	},
};
