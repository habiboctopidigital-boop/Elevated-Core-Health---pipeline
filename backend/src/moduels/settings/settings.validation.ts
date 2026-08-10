import { z } from "zod";

export const UpdateSettingSchema = z.object({
  body: z.object({
    value: z.string().min(1, "Setting value cannot be empty"),
  }),
});

export type UpdateSettingRequest = z.infer<typeof UpdateSettingSchema>;
