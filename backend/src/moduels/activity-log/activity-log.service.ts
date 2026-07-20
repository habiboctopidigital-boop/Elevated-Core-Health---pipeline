import { prisma } from "@/utils/prisma";
import { ServiceResponse } from "@/utils/serviceResponse";

export const activityLogService = {
	async list(rawQuery: Record<string, unknown>) {
		const where: Record<string, unknown> = {};

		const patientId = rawQuery.patientId as string | undefined;
		const type = rawQuery.type as string | undefined;
		const author = rawQuery.author as string | undefined;
		const startDate = rawQuery.startDate as string | undefined;
		const endDate = rawQuery.endDate as string | undefined;
		const page = Math.max(1, Number(rawQuery.page) || 1);
		const limit = Math.min(100, Math.max(1, Number(rawQuery.limit) || 50));

		if (patientId) where.patientId = patientId;
		if (type && ["auto", "manual"].includes(type)) where.type = type;
		if (author) where.author = { contains: author };
		if (startDate || endDate) {
			where.createdAt = {};
			if (startDate) (where.createdAt as Record<string, unknown>).gte = new Date(startDate);
			if (endDate) (where.createdAt as Record<string, unknown>).lte = new Date(endDate);
		}

		const [logs, total] = await Promise.all([
			prisma.activityLog.findMany({
				where,
				orderBy: { createdAt: "desc" },
				skip: (page - 1) * limit,
				take: limit,
				include: { patient: { select: { id: true, name: true } } },
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
