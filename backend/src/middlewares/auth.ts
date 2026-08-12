import type { NextFunction, Request, Response } from "express";

import { ROLE_RANK, type UserRole } from "@/config/roles";
import { verifyAccessToken } from "@/lib/auth";
import { AppError } from "@/utils/appError";
import { handleServiceResponse } from "@/utils/httpHandlers";
import { prisma } from "@/utils/prisma";
import { ServiceResponse } from "@/utils/serviceResponse";

const sendError = (err: unknown, res: Response, fallback: AppError): void => {
	const appError = err instanceof AppError ? err : fallback;
	handleServiceResponse(ServiceResponse.failure(appError.message, appError.data, appError.statusCode), res);
};

export const requireAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
	try {
		const authHeader = req.headers.authorization;
		if (!authHeader?.startsWith("Bearer ")) throw AppError.unauthorized();

		const token = authHeader.slice(7);
		const payload = verifyAccessToken(token);

		const user = await prisma.user.findUnique({
			where: { id: payload.userId },
			select: { id: true, name: true, email: true, role: true, avatar: true, status: true },
		});

		if (!user) throw AppError.unauthorized();
		// A deactivated account's existing access token (up to 15m TTL) must stop
		// working immediately, not just block future logins — otherwise
		// "deactivate this user" is a no-op until the token happens to expire.
		if (user.status === "inactive") throw AppError.forbidden("This account has been deactivated.");

		req.user = {
			id: user.id,
			name: user.name,
			email: user.email,
			role: user.role as UserRole,
			avatar: user.avatar,
		};
		next();
	} catch (err) {
		sendError(err, res, AppError.unauthorized());
	}
};

/**
 * Rank-based, not exact-match: a role satisfies `requireRole(...roles)` if it
 * is listed OR outranks the lowest-ranked role listed (config/roles.ts).
 * This is what keeps `requireRole("admin")` working for super_admin without
 * updating every call site — super_admin is a strict superset of admin
 * unless a route later opts into `requireExactRole`/`requireMinRole` (phase 2)
 * for the few cases (e.g. deleting an Admin) that must be super_admin-only.
 */
export const requireRole =
	(...roles: UserRole[]) =>
	(req: Request, res: Response, next: NextFunction): void => {
		if (!req.user) {
			sendError(null, res, AppError.unauthorized());
			return;
		}
		const minRank = Math.min(...roles.map((role) => ROLE_RANK[role]));
		if (ROLE_RANK[req.user.role] < minRank) {
			sendError(null, res, AppError.forbidden("You do not have permission to perform this action"));
			return;
		}
		next();
	};
