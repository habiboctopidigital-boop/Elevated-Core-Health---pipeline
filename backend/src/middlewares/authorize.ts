import type { NextFunction, Request, Response } from "express";

import { can, permissionLevel, type PermissionAction } from "@/config/permissions";
import { ROLE_RANK, type UserRole } from "@/config/roles";
import { AppError } from "@/utils/appError";
import { handleServiceResponse } from "@/utils/httpHandlers";
import { ServiceResponse } from "@/utils/serviceResponse";

/**
 * New authorization primitives (phase.md Phase 2). Additive: `requireAuth`
 * and `requireRole` in middlewares/auth.ts are untouched and every route
 * using them today keeps working exactly as-is. Nothing here is wired into
 * any router yet — routes adopt these deliberately, one at a time, starting
 * in later phases, so a mistake here can't silently change live behaviour.
 */

const sendForbidden = (res: Response, message = "You do not have permission to perform this action"): void => {
	const err = AppError.forbidden(message);
	handleServiceResponse(ServiceResponse.failure(err.message, err.data, err.statusCode), res);
};

const sendUnauthorized = (res: Response): void => {
	const err = AppError.unauthorized();
	handleServiceResponse(ServiceResponse.failure(err.message, err.data, err.statusCode), res);
};

/**
 * Rank-based minimum-role gate — same semantics as the (now rank-based)
 * requireRole in middlewares/auth.ts. This is the explicit, self-documenting
 * spelling for new code: `requireMinRole("super_admin")` reads as "at least
 * this rank" at the call site, which is the intent for the handful of
 * super-admin-only actions (§5, §11) coming in Phase 6.
 */
export const requireMinRole =
	(role: UserRole) =>
	(req: Request, res: Response, next: NextFunction): void => {
		if (!req.user) {
			sendUnauthorized(res);
			return;
		}
		if (ROLE_RANK[req.user.role] < ROLE_RANK[role]) {
			sendForbidden(res);
			return;
		}
		next();
	};

/**
 * Matrix-driven gate for a hard "allow" permission (config/permissions.ts).
 * Only use for actions where every role's cell is allow/deny — i.e. no
 * "restricted"/"conditional" case to resolve. For those, use
 * requireOwnership instead, since this alone can't know whether a given
 * resource belongs to the caller.
 */
export const requirePermission =
	(action: PermissionAction) =>
	(req: Request, res: Response, next: NextFunction): void => {
		if (!req.user) {
			sendUnauthorized(res);
			return;
		}
		if (!can(req.user.role, action)) {
			sendForbidden(res);
			return;
		}
		next();
	};

export interface OwnedResource {
	/** The user id this resource belongs to, or null if unowned (e.g. an unassigned patient). */
	ownerId: string | null;
}

/**
 * Ownership gate for §17's "restricted" / "conditional" cells (e.g. a VA
 * editing an appointment date is allowed only for their own assigned
 * patient). `loader` fetches the resource for the current request; admin and
 * super_admin always pass without needing it evaluated. A VA passes only
 * when `resource.ownerId === req.user.id`.
 */
export const requireOwnership =
	(action: PermissionAction, loader: (req: Request) => Promise<OwnedResource | null>) =>
	async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		if (!req.user) {
			sendUnauthorized(res);
			return;
		}

		const level = permissionLevel(req.user.role, action);
		if (level === "deny") {
			sendForbidden(res);
			return;
		}
		if (level === "allow") {
			next();
			return;
		}

		// "restricted" / "conditional" — must own the resource.
		try {
			const resource = await loader(req);
			if (!resource) {
				sendForbidden(res, "Resource not found or not accessible.");
				return;
			}
			if (resource.ownerId !== null && resource.ownerId === req.user.id) {
				next();
				return;
			}
			sendForbidden(res, "You do not have permission to perform this action on a resource you do not own.");
		} catch {
			sendForbidden(res);
		}
	};
