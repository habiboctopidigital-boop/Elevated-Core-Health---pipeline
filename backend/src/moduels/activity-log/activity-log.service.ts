import type { AuthenticatedUser } from "@/lib/types";
import { prisma } from "@/utils/prisma";
import { ServiceResponse } from "@/utils/serviceResponse";

export const activityLogService = {
	/**
	 * task.md §17 / phase.md Phase 5 — role-scoped listing, enforced server-side
	 * against the authenticated session, never against client-supplied params:
	 * - VA: own activity only. `actorId` is forced to the caller, so a crafted
	 *   `actorId`/`patientId` query can never widen the scope.
	 * - Admin: all VA activity + own activity + system events; another admin's
	 *   activity stays invisible (decision D5).
	 * - Super Admin: everything.
	 */
	async list(rawQuery: Record<string, unknown>, user: AuthenticatedUser) {
		const conditions: Record<string, unknown>[] = [];

		if (user.role === "va") {
			conditions.push({ actorId: user.id });
		} else if (user.role === "admin") {
			// The `actorId: null` branch must also require `actorRole: null`:
			// deleting a user nulls actorId on their historical rows (Prisma
			// SetNull default), so a deleted admin's rows would otherwise slip
			// into the "system events" branch and become visible to every admin
			// (D5 — admins never see another admin's activity). Deleted rows keep
			// their denormalized actorRole, so `{actorRole: "va"}` still covers
			// deleted VAs.
			conditions.push({
				OR: [{ actorId: user.id }, { actorRole: "va" }, { actorId: null, actorRole: null }],
			});
		}

		const patientId = rawQuery.patientId as string | undefined;
		const type = rawQuery.type as string | undefined;
		const category = rawQuery.category as string | undefined;
		const author = rawQuery.author as string | undefined;
		const actorId = rawQuery.actorId as string | undefined;
		const role = rawQuery.role as string | undefined;
		const action = rawQuery.action as string | undefined;
		const entityType = rawQuery.entityType as string | undefined;
		const entityId = rawQuery.entityId as string | undefined;
		const q = rawQuery.q as string | undefined;
		const startDate = rawQuery.startDate as string | undefined;
		const endDate = rawQuery.endDate as string | undefined;
		const page = Math.max(1, Number(rawQuery.page) || 1);
		const limit = Math.min(100, Math.max(1, Number(rawQuery.limit) || 50));

		if (patientId) conditions.push({ patientId });
		if (category) conditions.push({ category });
		if (type && ["auto", "manual"].includes(type)) conditions.push({ type });
		if (author) conditions.push({ author: { contains: author } });
		// VA scope is forced to self above — only admin/super_admin may filter by actor.
		if (actorId && user.role !== "va") conditions.push({ actorId });
		if (role && ["super_admin", "admin", "va"].includes(role)) conditions.push({ actorRole: role });
		if (action) conditions.push({ action });
		if (entityType) conditions.push({ entityType });
		if (entityId) conditions.push({ entityId });
		if (q) {
			conditions.push({
				OR: [
					{ message: { contains: q, mode: "insensitive" } },
					{ author: { contains: q, mode: "insensitive" } },
					{ actorName: { contains: q, mode: "insensitive" } },
					{ patient: { name: { contains: q, mode: "insensitive" } } },
				],
			});
		}
		if (startDate || endDate) {
			const dateFilter: Record<string, unknown> = {};
			if (startDate) dateFilter.gte = new Date(startDate);
			if (endDate) {
				// Treat endDate as inclusive of the whole day when only a date (no time) is given.
				const end = new Date(endDate);
				if (endDate.length <= 10) end.setHours(23, 59, 59, 999);
				dateFilter.lte = end;
			}
			conditions.push({ createdAt: dateFilter });
		}

		const where: Record<string, unknown> = conditions.length > 0 ? { AND: conditions } : {};

		const [logs, total] = await Promise.all([
			prisma.activityLog.findMany({
				where,
				orderBy: { createdAt: "desc" },
				skip: (page - 1) * limit,
				take: limit,
				include: {
					patient: { select: { id: true, name: true } },
					actor: { select: { id: true, name: true, role: true } },
				},
			}),
			prisma.activityLog.count({ where }),
		]);

		return ServiceResponse.success("Activity logs retrieved.", {
			logs,
			total,
			page,
			limit,
			totalPages: Math.ceil(total / limit),
		});
	},
};
