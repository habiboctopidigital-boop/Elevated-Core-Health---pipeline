import { z } from "zod";

export const ApplyImportSchema = z.object({
	body: z.object({
		rows: z.array(z.record(z.string(), z.unknown())).min(1).max(5000),
		fileName: z.string().trim().max(255).optional(),
		fileType: z.enum(["csv", "xlsx", "xls"]).optional(),
	}),
});

export type ApplyImportInput = z.infer<typeof ApplyImportSchema>["body"];
