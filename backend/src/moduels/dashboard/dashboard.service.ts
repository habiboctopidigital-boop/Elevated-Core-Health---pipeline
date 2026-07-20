import { prisma } from "@/utils/prisma";
import { ServiceResponse } from "@/utils/serviceResponse";

export const dashboardService = {
	async getSummary() {
		const staleThreshold = new Date(Date.now() - 48 * 60 * 60 * 1000);

		const [staleCount, flaggedCount] = await Promise.all([
			prisma.patient.count({
				where: {
					stage: { not: "reconciled" },
					updatedAt: { lt: staleThreshold },
				},
			}),
			prisma.patient.count({
				where: { isFlagged: true },
			}),
		]);

		return ServiceResponse.success("Dashboard summary.", {
			staleCount,
			flaggedCount,
			allCaughtUp: staleCount === 0 && flaggedCount === 0,
		});
	},
};
