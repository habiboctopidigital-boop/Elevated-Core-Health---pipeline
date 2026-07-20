import { z } from "zod";

export const CreateUserSchema = z.object({
	body: z.object({
		name: z.string().trim().min(1).max(100),
		email: z.string().trim().toLowerCase().email(),
		password: z.string().min(8).max(128),
		role: z.enum(["admin", "va"]),
		shift: z.enum(["morning", "evening"]).nullable().optional(),
	}),
});

export const UpdateUserSchema = z.object({
	body: z.object({
		name: z.string().trim().min(1).max(100).optional(),
		email: z.string().trim().toLowerCase().email().optional(),
		password: z.string().min(8).max(128).optional(),
		role: z.enum(["admin", "va"]).optional(),
		shift: z.enum(["morning", "evening"]).nullable().optional(),
	}),
});

export const ChecklistItemSchema = z.object({
	body: z.object({
		stage: z.enum([
			"onboarding",
			"visit_complete",
			"post_visit_docs",
			"chart_signed",
			"sent_to_billing",
			"payment_posted",
			"reconciled",
		]),
		label: z.string().trim().min(1).max(200),
		sortOrder: z.number().int().min(0).default(0),
	}),
});
