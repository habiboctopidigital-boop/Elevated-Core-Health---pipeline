import type { AuthenticatedUser } from "@/lib/types";
import { logger } from "@/utils/logger";
import { prisma } from "@/utils/prisma";

export interface AuditEntry {
	patientId: string;
	/** null = system action (e.g. webhook intake) */
	user: AuthenticatedUser | null;
	/** Stable machine-readable action id, e.g. "stage.move", "checklist.toggle" */
	action: string;
	entityType?: string;
	entityId?: string;
	prevValue?: unknown;
	newValue?: unknown;
	/** Human-readable summary shown in the handoff log UI */
	message: string;
	type?: "auto" | "manual";
	metadata?: Record<string, unknown>;
}

/**
 * Structured activity tracker. Every meaningful mutation should call this so
 * the handoff log can answer: WHO did WHAT, WHAT changed (prev → new), WHEN,
 * and on WHICH entity. Never throws — logging must not break the main flow.
 */
export async function audit(entry: AuditEntry): Promise<void> {
	try {
		await prisma.activityLog.create({
			data: {
				patientId: entry.patientId,
				author: entry.user?.name ?? "system",
				actorId: entry.user?.id ?? null,
				action: entry.action,
				entityType: entry.entityType ?? null,
				entityId: entry.entityId ?? null,
				...(entry.prevValue !== undefined ? { prevValue: entry.prevValue as object } : {}),
				...(entry.newValue !== undefined ? { newValue: entry.newValue as object } : {}),
				metadata: (entry.metadata ?? {}) as object,
				message: entry.message,
				type: entry.type ?? "manual",
			},
		});
	} catch (err) {
		logger.error({ err, patientId: entry.patientId }, "Failed to write audit log");
	}
}
