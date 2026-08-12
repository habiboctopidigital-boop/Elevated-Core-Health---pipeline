import { getFinalStageKeys } from "@/config/stages";
import { patientScopeFor } from "@/lib/scope";
import type { AuthenticatedUser } from "@/lib/types";
import { settingsService } from "@/moduels/settings/settings.service";
import { prisma } from "@/utils/prisma";
import { ServiceResponse } from "@/utils/serviceResponse";

export const dashboardService = {
	/**
	 * task.md §17: a VA's status bar reflects only their own world (assigned +
	 * unassigned patients), not the whole pipeline — admin/super_admin are
	 * unaffected since patientScopeFor returns {} for them.
	 */
	async getSummary(user: AuthenticatedUser) {
		// Get stale threshold from settings (defaults to 48 hours)
		const staleThresholdMs = await settingsService.getStaleThresholdMs();
		const staleThreshold = new Date(Date.now() - staleThresholdMs);

		// Stages marked as Final are exempt from the stale flag (was hardcoded "reconciled").
		const finalKeys = await getFinalStageKeys();
		const scope = patientScopeFor(user);

		const [staleCount, flaggedCount] = await Promise.all([
			prisma.patient.count({
				where: {
					...scope,
					...(finalKeys.length > 0 ? { stage: { notIn: finalKeys } } : {}),
					updatedAt: { lt: staleThreshold },
				},
			}),
			prisma.patient.count({
				where: { ...scope, isFlagged: true },
			}),
		]);

		return ServiceResponse.success("Dashboard summary.", {
			staleCount,
			flaggedCount,
			allCaughtUp: staleCount === 0 && flaggedCount === 0,
		});
	},
};
