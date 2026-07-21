import { z } from "zod";

export const ImportFileSchema = z.object({
  body: z.object({
    fileName: z.string().optional(),
  }),
});

export type ImportFileInput = z.infer<typeof ImportFileSchema>["body"];
