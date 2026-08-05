import { z } from "zod";

export const CrmQuerySchema = z.object({
	query: z.object({
		search: z.string().trim().max(200).optional(),
		status: z.enum(["active", "completed", "cancelled"]).optional(),
		stage: z.string().trim().max(100).optional(),
		eligibility: z.enum(["not_checked", "eligible", "not_eligible"]).optional(),
		assignedTo: z.string().uuid().optional(),
		page: z.coerce.number().int().positive().default(1),
		limit: z.coerce.number().int().positive().max(200).default(25),
	}),
});
