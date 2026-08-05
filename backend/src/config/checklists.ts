import { logger } from "@/utils/logger";
import { prisma } from "@/utils/prisma";

export interface ChecklistItemDef {
	id: string;
	label: string;
	description: string | null;
	status: "required" | "optional";
	isDefault: boolean;
	sortOrder: number;
}

export async function getChecklistItemsForStage(stage: string): Promise<ChecklistItemDef[]> {
	try {
		const items = await prisma.checklistItem.findMany({
			where: { stage },
			orderBy: { sortOrder: "asc" },
			select: { id: true, label: true, description: true, status: true, isDefault: true, sortOrder: true },
		});
		return items;
	} catch (err) {
		// If the checklist_items table doesn't exist yet or any query error occurs,
		// treat it as "no checklist items defined" so the app doesn't crash.
		logger.warn({ err, stage }, "getChecklistItemsForStage: query failed, treating as empty");
		return [];
	}
}

/**
 * A stage's checklist is considered complete when every REQUIRED item is
 * checked. Optional items never block a forward stage move.
 */
export async function isChecklistComplete(stage: string, checklistState: Record<string, boolean>): Promise<boolean> {
	try {
		const items = await getChecklistItemsForStage(stage);
		const required = items.filter((item) => item.status === "required");
		if (required.length === 0) return true;
		return required.every((item) => checklistState[item.id] === true);
	} catch (err) {
		// Fail open: if we can't verify, allow the move rather than block the user.
		logger.warn({ err, stage }, "isChecklistComplete: failed to check, defaulting to true");
		return true;
	}
}
