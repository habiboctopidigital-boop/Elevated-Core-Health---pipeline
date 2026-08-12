import { z } from "zod";

/**
 * Logs a client-generated export (e.g. the workload calendar's CSV download,
 * which is built entirely in the browser from already-fetched data — there's
 * no server-side "export" request to observe otherwise). Server-generated
 * exports (CRM contacts CSV) are audited directly in their own service and
 * don't need this endpoint.
 */
export const ExportLogSchema = z.object({
	body: z.object({
		reportType: z.string().trim().min(1).max(100),
		/** Human-readable record noun for the activity message (e.g. "appointment"). Defaults to `reportType` when omitted. */
		label: z.string().trim().min(1).max(100).optional(),
		scope: z.string().trim().max(200).optional(),
		recordCount: z.number().int().min(0),
		format: z.enum(["csv", "xlsx"]),
	}),
});

export type ExportLogInput = z.infer<typeof ExportLogSchema>["body"];
