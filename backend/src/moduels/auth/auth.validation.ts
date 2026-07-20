import { z } from "zod";

export const LoginSchema = z.object({
	body: z.object({
		email: z.string().trim().toLowerCase().email("A valid email address is required"),
		password: z.string().min(1, "Password is required"),
	}),
});

export const RefreshSchema = z.object({
	body: z.object({
		refreshToken: z.string().min(1, "Refresh token is required"),
	}),
});

export type LoginInput = z.infer<typeof LoginSchema>["body"];
export type RefreshInput = z.infer<typeof RefreshSchema>["body"];
