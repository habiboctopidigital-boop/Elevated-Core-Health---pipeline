import { getFinalStageKeys } from "@/config/stages";
import { prisma } from "@/utils/prisma";
import { ServiceResponse } from "@/utils/serviceResponse";

export const dashboardService = {
	async getSummary() {
		const staleThreshold = new Date(Date.now() - 48 * 60 * 60 * 1000);

		// Stages marked as Final are exempt from the stale flag (was hardcoded "reconciled").
		const finalKeys = await getFinalStageKeys();

		const [staleCount, flaggedCount] = await Promise.all([
			prisma.patient.count({
				where: {
					...(finalKeys.length > 0 ? { stage: { notIn: finalKeys } } : {}),
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
