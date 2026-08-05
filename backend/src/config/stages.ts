import { prisma } from "@/utils/prisma";

/**
 * Single source of truth for pipeline stages, now DB-driven.
 * Stage `key`s are stable/immutable identifiers (e.g. "onboarding");
 * admin edits display name, hint, order and flags via the admin module.
 */

/** Active stages in pipeline order (used to render the board). */
export async function getActiveStages() {
	return prisma.stage.findMany({
		where: { isActive: true },
		orderBy: { sortOrder: "asc" },
	});
}

/** Every stage (active + inactive) in order — admin only. */
export async function getAllStages() {
	return prisma.stage.findMany({ orderBy: { sortOrder: "asc" } });
}

/** Ordered list of active stage keys — replaces the old hardcoded STAGE_ORDER. */
export async function getStageOrder(): Promise<string[]> {
	const stages = await getActiveStages();
	return stages.map((s) => s.key);
}

/** Keys of stages marked as final — those are exempt from the stale flag. */
export async function getFinalStageKeys(): Promise<string[]> {
	const stages = await prisma.stage.findMany({
		where: { isFinal: true },
		select: { key: true },
	});
	return stages.map((s) => s.key);
}

/** First active stage — used when creating new patients (webhook intake). */
export async function getFirstStageKey(): Promise<string> {
	const first = await prisma.stage.findFirst({
		where: { isActive: true },
		orderBy: { sortOrder: "asc" },
		select: { key: true },
	});
	return first?.key ?? "onboarding";
}
