import { z } from "zod";

export const ActivityLogQuerySchema = z.object({
	query: z.object({
		patientId: z.string().optional(),
		type: z.enum(["auto", "manual"]).optional(),
		author: z.string().optional(),
		startDate: z.string().optional(),
		endDate: z.string().optional(),
		page: z.coerce.number().int().positive().default(1),
		limit: z.coerce.number().int().positive().max(100).default(50),
	}),
});
