import { prisma } from "@/utils/prisma";
import { ServiceResponse } from "@/utils/serviceResponse";

export const activityLogService = {
	async list(rawQuery: Record<string, unknown>) {
		const where: Record<string, unknown> = {};

		const patientId = rawQuery.patientId as string | undefined;
		const type = rawQuery.type as string | undefined;
		const author = rawQuery.author as string | undefined;
		const actorId = rawQuery.actorId as string | undefined;
		const action = rawQuery.action as string | undefined;
		const startDate = rawQuery.startDate as string | undefined;
		const endDate = rawQuery.endDate as string | undefined;
		const page = Math.max(1, Number(rawQuery.page) || 1);
		const limit = Math.min(100, Math.max(1, Number(rawQuery.limit) || 50));

		if (patientId) where.patientId = patientId;
		if (type && ["auto", "manual"].includes(type)) where.type = type;
		if (author) where.author = { contains: author };
		if (actorId) where.actorId = actorId;
		if (action) where.action = action;
		if (startDate || endDate) {
			where.createdAt = {};
			if (startDate) (where.createdAt as Record<string, unknown>).gte = new Date(startDate);
			if (endDate) {
				// Treat endDate as inclusive of the whole day when only a date (no time) is given.
				const end = new Date(endDate);
				if (endDate.length <= 10) end.setHours(23, 59, 59, 999);
				(where.createdAt as Record<string, unknown>).lte = end;
			}
		}

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
