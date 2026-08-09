import { z } from "zod";

export const StageMoveSchema = z.object({
	body: z.object({
		// Stage keys are now DB-driven; existence is validated in the service.
		targetStage: z.string().trim().min(1, "Target stage is required").max(100),
	}),
});

export const AssignSchema = z.object({
	body: z.object({
		assignedTo: z.string().uuid().nullable(),
	}),
});

export const ChecklistToggleSchema = z.object({
	body: z.object({
		itemId: z.string().uuid(),
		checked: z.boolean(),
	}),
});

export const NotesSchema = z.object({
	body: z.object({
		notes: z.string().max(2000, "Notes must be at most 2000 characters"),
	}),
});

export const FlagSchema = z.object({
	body: z.object({
		reason: z.string().min(1, "Reason is required").max(500, "Reason must be at most 500 characters"),
	}),
});

export const ClearFlagSchema = z.object({
	body: z.object({
		clearReason: z.string().min(1, "Clear reason is required").max(500, "Clear reason must be at most 500 characters"),
	}),
});

export const IntakeSchema = z.object({
	body: z.object({
		name: z.string().trim().min(1, "Patient name is required").refine(
			(name) => name.trim().length > 0,
			"Patient name cannot be empty"
		),
		email: z.string().email().optional().nullable(),
		phone: z.string().optional().nullable(),
		location: z.string().trim().max(200).optional().nullable(),
		appointmentDatetime: z.string().datetime().optional().nullable(),
		vaName: z.string().trim().max(100).optional().nullable(),
		// Explicit VA selection (e.g. from the Add Patient form's assign dropdown) —
		// takes priority over vaName matching and time-based auto-assignment.
		assignedTo: z.string().uuid().optional().nullable(),
		bookingPlatform: z.enum(["klarity", "zocdoc", "headway", "grow_therapy", "google", "phone", "walk_in"]).optional().nullable(),
		problemDescription: z.string().max(2000).optional().nullable(),
		paymentMethod: z.string().max(100).optional().nullable(),
		insuranceProvider: z.string().max(200).optional().nullable(),
		paymentDetails: z.record(z.string(), z.unknown()).optional().nullable(),
		visitStatus: z.enum(["not_visited", "arrived", "no_show", "rescheduled"]).optional(),
	}),
});

export const CheckEligibilitySchema = z.object({
	body: z
		.object({
			paymentMethod: z.string().max(100).optional().nullable(),
			insuranceProvider: z.string().max(200).optional().nullable(),
			paymentDetails: z.record(z.string(), z.unknown()).optional().nullable(),
		})
		.optional(),
});

const moneyValue = z
	.string()
	.trim()
	.regex(/^\d+(\.\d{1,2})?$/, "Amount must be a number (e.g. 30 or 30.50)")
	.or(z.number().nonnegative());

export const UpdatePatientSchema = z.object({
	body: z.object({
		firstName: z.string().trim().max(100).optional().nullable(),
		lastName: z.string().trim().max(100).optional().nullable(),
		location: z.string().trim().max(200).optional().nullable(),
		email: z.string().trim().email().optional().nullable(),
		phone: z.string().trim().max(50).optional().nullable(),
		copayAmount: moneyValue.optional().nullable(),
		amountPaid: moneyValue.optional().nullable(),
		paymentMethod: z.string().trim().max(100).optional().nullable(),
		insuranceProvider: z.string().trim().max(200).optional().nullable(),
		visitStatus: z.enum(["not_visited", "arrived", "no_show", "rescheduled"]).optional(),
	}),
});

export const UpdateStatusSchema = z.object({
	body: z.object({
		status: z.enum(["active", "cancelled"]),
		reason: z.string().trim().max(300).optional().nullable(),
	}),
});

export const ClaimSchema = z.object({
	body: z.object({
		userId: z.string().uuid(),
	}),
});

export const UpdateAppointmentSchema = z.object({
	body: z.object({
		appointmentDatetime: z.string().datetime("Appointment datetime must be a valid ISO 8601 datetime"),
	}),
});

export type StageMoveInput = z.infer<typeof StageMoveSchema>["body"];
export type AssignInput = z.infer<typeof AssignSchema>["body"];
export type ChecklistToggleInput = z.infer<typeof ChecklistToggleSchema>["body"];
export type NotesInput = z.infer<typeof NotesSchema>["body"];
export type FlagInput = z.infer<typeof FlagSchema>["body"];
export type ClearFlagInput = z.infer<typeof ClearFlagSchema>["body"];
export type IntakeInput = z.infer<typeof IntakeSchema>["body"];
export type ClaimInput = z.infer<typeof ClaimSchema>["body"];
export type CheckEligibilityInput = z.infer<typeof CheckEligibilitySchema>["body"];
export type UpdatePatientInput = z.infer<typeof UpdatePatientSchema>["body"];
export type UpdateStatusInput = z.infer<typeof UpdateStatusSchema>["body"];
export type UpdateAppointmentInput = z.infer<typeof UpdateAppointmentSchema>["body"];
