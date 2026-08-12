import { z } from "zod";

export const CreateUserSchema = z.object({
	body: z.object({
		name: z.string().trim().min(1).max(100),
		email: z.string().trim().toLowerCase().email(),
		password: z.string().min(8).max(128),
		// super_admin is deliberately not assignable here — it's a protected,
		// out-of-band-managed tier (task.md §5, §11), never created via the
		// ordinary user-management form.
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
		status: z.enum(["active", "inactive"]).optional(),
	}),
});

export const ChecklistItemSchema = z.object({
	body: z.object({
		// Stage keys are DB-driven; existence is validated in the service.
		stage: z.string().trim().min(1).max(100),
		label: z.string().trim().min(1).max(200),
		status: z.enum(["required", "optional"]).default("required"),
		sortOrder: z.number().int().min(0).default(0),
	}),
});

export const UpdateChecklistItemSchema = z.object({
	body: z.object({
		stage: z.string().trim().min(1).max(100).optional(),
		label: z.string().trim().min(1).max(200).optional(),
		status: z.enum(["required", "optional"]).optional(),
		sortOrder: z.number().int().min(0).optional(),
	}),
});

export const StageCreateSchema = z.object({
	body: z.object({
		name: z.string().trim().min(1).max(100),
		hint: z.string().trim().max(300).optional().nullable(),
		isFinal: z.boolean().optional(),
		isActive: z.boolean().optional(),
	}),
});

export const StageUpdateSchema = z.object({
	body: z.object({
		name: z.string().trim().min(1).max(100).optional(),
		hint: z.string().trim().max(300).optional().nullable(),
		sortOrder: z.number().int().min(0).optional(),
		isFinal: z.boolean().optional(),
		isActive: z.boolean().optional(),
	}),
});

export const StageReorderSchema = z.object({
	body: z.object({
		keys: z.array(z.string().trim().min(1).max(100)).min(1),
	}),
});

export const CreateEligibilityRuleSchema = z.object({
	body: z.object({
		label: z.string().trim().min(1).max(200),
		field: z.string().trim().min(1).max(100),
		operator: z.string().trim().min(1).max(50),
		value: z.string().trim().max(200).optional().nullable(),
		isActive: z.boolean().default(true),
	}),
});

export const UpdateEligibilityRuleSchema = z.object({
	body: z.object({
		label: z.string().trim().min(1).max(200).optional(),
		field: z.string().trim().min(1).max(100).optional(),
		operator: z.string().trim().min(1).max(50).optional(),
		value: z.string().trim().max(200).optional().nullable(),
		isActive: z.boolean().optional(),
	}),
});

export const CrmConnectSchema = z.object({
	body: z.object({
		provider: z.enum(["private_crm", "gohighlevel"]),
		apiKey: z.string().trim().min(8, "API key looks too short").max(500),
		permission: z.enum(["read", "write", "both"]).default("read"),
	}),
});

export const CrmUpdatePermissionSchema = z.object({
	body: z.object({
		permission: z.enum(["read", "write", "both"]),
	}),
});
