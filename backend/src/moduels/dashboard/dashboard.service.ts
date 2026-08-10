import { getFinalStageKeys } from "@/config/stages";
import { settingsService } from "@/moduels/settings/settings.service";
import { prisma } from "@/utils/prisma";
import { ServiceResponse } from "@/utils/serviceResponse";

export const dashboardService = {
	async getSummary() {
		// Get stale threshold from settings (defaults to 48 hours)
		const staleThresholdMs = await settingsService.getStaleThresholdMs();
		const staleThreshold = new Date(Date.now() - staleThresholdMs);

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
