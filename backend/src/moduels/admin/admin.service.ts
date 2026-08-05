import { StatusCodes } from "http-status-codes";
import type { z } from "zod";
import { hashPassword } from "@/lib/auth";
import { prisma } from "@/utils/prisma";
import { ServiceResponse } from "@/utils/serviceResponse";
import type {
	ChecklistItemSchema,
	CreateEligibilityRuleSchema,
	CreateUserSchema,
	StageCreateSchema,
	StageReorderSchema,
	StageUpdateSchema,
	UpdateChecklistItemSchema,
	UpdateEligibilityRuleSchema,
	UpdateUserSchema,
} from "./admin.validation";

type CreateUserInput = z.infer<typeof CreateUserSchema>["body"];
type UpdateUserInput = z.infer<typeof UpdateUserSchema>["body"];
type ChecklistItemInput = z.infer<typeof ChecklistItemSchema>["body"];
type UpdateChecklistItemInput = z.infer<typeof UpdateChecklistItemSchema>["body"];
type CreateEligibilityRuleInput = z.infer<typeof CreateEligibilityRuleSchema>["body"];
type UpdateEligibilityRuleInput = z.infer<typeof UpdateEligibilityRuleSchema>["body"];
type CreateStageInput = z.infer<typeof StageCreateSchema>["body"];
type UpdateStageInput = z.infer<typeof StageUpdateSchema>["body"];
type StageReorderInput = z.infer<typeof StageReorderSchema>["body"];

/** Turn a stage display name into a stable, immutable key slug. */
function slugify(input: string): string {
	return input
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "_")
		.replace(/^_+|_+$/g, "")
		.slice(0, 50);
}

export const adminService = {
	// User management
	async listUsers() {
		const users = await prisma.user.findMany({
			select: { id: true, name: true, email: true, role: true, shift: true, createdAt: true },
			orderBy: { createdAt: "asc" },
		});
		return ServiceResponse.success("Users retrieved.", users);
	},

	async createUser(input: CreateUserInput) {
		const existing = await prisma.user.findUnique({ where: { email: input.email } });
		if (existing) {
			return ServiceResponse.failure("A user with this email already exists.", null, StatusCodes.CONFLICT);
		}

		const passwordHash = await hashPassword(input.password);
		const user = await prisma.user.create({
			data: {
				name: input.name,
				email: input.email,
				passwordHash,
				role: input.role,
				shift: input.shift ?? null,
			},
			select: { id: true, name: true, email: true, role: true, shift: true, createdAt: true },
		});

		return ServiceResponse.success("User created.", user, StatusCodes.CREATED);
	},

	async updateUser(id: string, input: UpdateUserInput) {
		const existing = await prisma.user.findUnique({ where: { id } });
		if (!existing) {
			return ServiceResponse.failure("User not found.", null, StatusCodes.NOT_FOUND);
		}

		const data: Record<string, unknown> = {};
		if (input.name !== undefined) data.name = input.name;
		if (input.email !== undefined) data.email = input.email;
		if (input.role !== undefined) data.role = input.role;
		if (input.shift !== undefined) data.shift = input.shift;
		if (input.password !== undefined) {
			data.passwordHash = await hashPassword(input.password);
		}

		const user = await prisma.user.update({
			where: { id },
			data,
			select: { id: true, name: true, email: true, role: true, shift: true, createdAt: true },
		});

		return ServiceResponse.success("User updated.", user);
	},

	async deleteUser(id: string) {
		const existing = await prisma.user.findUnique({ where: { id } });
		if (!existing) {
			return ServiceResponse.failure("User not found.", null, StatusCodes.NOT_FOUND);
		}

		await prisma.user.delete({ where: { id } });
		return ServiceResponse.success("User deleted.", null);
	},

	// Stage management
	async listStages() {
		const stages = await prisma.stage.findMany({ orderBy: { sortOrder: "asc" } });
		return ServiceResponse.success("Stages retrieved.", stages);
	},

	async createStage(input: CreateStageInput) {
		const key = slugify(input.name);
		if (!key) {
			return ServiceResponse.failure(
				"Stage name must contain at least one letter or number.",
				null,
				StatusCodes.BAD_REQUEST,
			);
		}

		const existing = await prisma.stage.findUnique({ where: { key } });
		if (existing) {
			return ServiceResponse.failure(
				`A stage with key "${key}" already exists. Choose a different name.`,
				null,
				StatusCodes.CONFLICT,
			);
		}

		const maxOrder = await prisma.stage.aggregate({ _max: { sortOrder: true } });

		const stage = await prisma.stage.create({
			data: {
				key,
				name: input.name.trim(),
				hint: input.hint?.trim() || null,
				sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
				isFinal: input.isFinal ?? false,
				isActive: input.isActive ?? true,
			},
		});

		return ServiceResponse.success("Stage created.", stage, StatusCodes.CREATED);
	},

	async updateStage(key: string, input: UpdateStageInput) {
		const stage = await prisma.stage.findUnique({ where: { key } });
		if (!stage) {
			return ServiceResponse.failure("Stage not found.", null, StatusCodes.NOT_FOUND);
		}

		const data: Record<string, unknown> = {};
		if (input.name !== undefined) data.name = input.name.trim();
		if (input.hint !== undefined) data.hint = input.hint?.trim() || null;
		if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder;
		if (input.isFinal !== undefined) data.isFinal = input.isFinal;
		if (input.isActive !== undefined) {
			if (!input.isActive) {
				const patientCount = await prisma.patient.count({ where: { stage: key } });
				if (patientCount > 0) {
					return ServiceResponse.failure(
						"Cannot disable a stage that still has patients. Move them out first.",
						null,
						StatusCodes.BAD_REQUEST,
					);
				}
				const activeCount = await prisma.stage.count({ where: { isActive: true } });
				if (activeCount <= 1) {
					return ServiceResponse.failure("Cannot disable the last active stage.", null, StatusCodes.BAD_REQUEST);
				}
			}
			data.isActive = input.isActive;
		}

		const updated = await prisma.stage.update({ where: { key }, data });
		return ServiceResponse.success("Stage updated.", updated);
	},

	async reorderStages(input: StageReorderInput) {
		const existing = await prisma.stage.findMany({ select: { key: true } });
		const existingKeys = new Set(existing.map((s) => s.key));
		if (input.keys.length !== existingKeys.size || !input.keys.every((k) => existingKeys.has(k))) {
			return ServiceResponse.failure(
				"Reorder list must contain exactly the current stage keys.",
				null,
				StatusCodes.BAD_REQUEST,
			);
		}

		await prisma.$transaction(
			input.keys.map((key, index) => prisma.stage.update({ where: { key }, data: { sortOrder: index } })),
		);

		return ServiceResponse.success("Stage order updated.", null);
	},

	async deleteStage(key: string) {
		const stage = await prisma.stage.findUnique({ where: { key } });
		if (!stage) {
			return ServiceResponse.failure("Stage not found.", null, StatusCodes.NOT_FOUND);
		}

		const [patientCount, itemCount] = await Promise.all([
			prisma.patient.count({ where: { stage: key } }),
			prisma.checklistItem.count({ where: { stage: key } }),
		]);

		if (patientCount > 0) {
			return ServiceResponse.failure(
				"Cannot delete a stage that still has patients. Move them out first.",
				null,
				StatusCodes.BAD_REQUEST,
			);
		}
		if (itemCount > 0) {
			return ServiceResponse.failure(
				"Cannot delete a stage that still has checklist items. Remove them first.",
				null,
				StatusCodes.BAD_REQUEST,
			);
		}

		const totalStages = await prisma.stage.count();
		if (totalStages <= 1) {
			return ServiceResponse.failure(
				"Cannot delete the last stage. At least one stage is required.",
				null,
				StatusCodes.BAD_REQUEST,
			);
		}

		await prisma.stage.delete({ where: { key } });
		return ServiceResponse.success("Stage deleted.", null);
	},

	// Checklist management
	async createChecklistItem(input: ChecklistItemInput) {
		const stage = await prisma.stage.findUnique({ where: { key: input.stage } });
		if (!stage) {
			return ServiceResponse.failure("Stage not found. Create the stage first.", null, StatusCodes.BAD_REQUEST);
		}

		const item = await prisma.checklistItem.create({
			data: {
				stage: input.stage,
				label: input.label,
				status: input.status,
				sortOrder: input.sortOrder,
				isDefault: false,
			},
		});
		return ServiceResponse.success("Checklist item created.", item, StatusCodes.CREATED);
	},

	async listChecklistItems() {
		const items = await prisma.checklistItem.findMany({
			orderBy: [{ stage: "asc" }, { sortOrder: "asc" }],
		});
		return ServiceResponse.success("Checklist items retrieved.", items);
	},

	async deleteChecklistItem(id: string) {
		const item = await prisma.checklistItem.findUnique({ where: { id } });
		if (!item) {
			return ServiceResponse.failure("Checklist item not found.", null, StatusCodes.NOT_FOUND);
		}
		if (item.isDefault) {
			return ServiceResponse.failure("Cannot delete default checklist items.", null, StatusCodes.BAD_REQUEST);
		}
		await prisma.checklistItem.delete({ where: { id } });
		return ServiceResponse.success("Checklist item deleted.", null);
	},

	async updateChecklistItem(id: string, input: UpdateChecklistItemInput) {
		const item = await prisma.checklistItem.findUnique({ where: { id } });
		if (!item) {
			return ServiceResponse.failure("Checklist item not found.", null, StatusCodes.NOT_FOUND);
		}

		if (input.stage !== undefined) {
			const stage = await prisma.stage.findUnique({ where: { key: input.stage } });
			if (!stage) {
				return ServiceResponse.failure("Stage not found.", null, StatusCodes.BAD_REQUEST);
			}
		}

		const updated = await prisma.checklistItem.update({
			where: { id },
			data: {
				...(input.stage !== undefined ? { stage: input.stage } : {}),
				...(input.label !== undefined ? { label: input.label } : {}),
				...(input.status !== undefined ? { status: input.status } : {}),
				...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
			},
		});

		return ServiceResponse.success("Checklist item updated.", updated);
	},

	// Eligibility rule management
	async listEligibilityRules() {
		const rules = await prisma.eligibilityRule.findMany({
			orderBy: { createdAt: "asc" },
		});
		return ServiceResponse.success("Eligibility rules retrieved.", rules);
	},

	async createEligibilityRule(input: CreateEligibilityRuleInput) {
		const rule = await prisma.eligibilityRule.create({
			data: {
				label: input.label,
				field: input.field,
				operator: input.operator,
				value: input.value ?? null,
				isActive: input.isActive,
			},
		});
		return ServiceResponse.success("Eligibility rule created.", rule, StatusCodes.CREATED);
	},

	async updateEligibilityRule(id: string, input: UpdateEligibilityRuleInput) {
		const rule = await prisma.eligibilityRule.findUnique({ where: { id } });
		if (!rule) {
			return ServiceResponse.failure("Eligibility rule not found.", null, StatusCodes.NOT_FOUND);
		}

		const updated = await prisma.eligibilityRule.update({
			where: { id },
			data: {
				...(input.label !== undefined ? { label: input.label } : {}),
				...(input.field !== undefined ? { field: input.field } : {}),
				...(input.operator !== undefined ? { operator: input.operator } : {}),
				...(input.value !== undefined ? { value: input.value } : {}),
				...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
			},
		});

		return ServiceResponse.success("Eligibility rule updated.", updated);
	},

	async deleteEligibilityRule(id: string) {
		const rule = await prisma.eligibilityRule.findUnique({ where: { id } });
		if (!rule) {
			return ServiceResponse.failure("Eligibility rule not found.", null, StatusCodes.NOT_FOUND);
		}

		await prisma.eligibilityRule.delete({ where: { id } });
		return ServiceResponse.success("Eligibility rule deleted.", null);
	},

	// Analytics
	async getAnalytics() {
		const allPatients = await prisma.patient.findMany({
			select: { stage: true, createdAt: true, updatedAt: true },
		});

		const perStage: Record<string, number> = {};
		for (const p of allPatients) {
			perStage[p.stage] = (perStage[p.stage] || 0) + 1;
		}

		const perVa = await prisma.user.findMany({
			where: { role: "va" },
			select: {
				id: true,
				name: true,
				_count: { select: { assignedPatients: true } },
			},
		});

		const vaLoad = perVa.map((u) => ({ id: u.id, name: u.name, patientCount: u._count.assignedPatients }));

		const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
		const reconciledThisWeek = await prisma.activityLog.count({
			where: {
				message: { contains: "reconciled" },
				createdAt: { gte: oneWeekAgo },
			},
		});

		return ServiceResponse.success("Analytics retrieved.", {
			patientsPerStage: perStage,
			vaLoad,
			reconciledThisWeek,
		});
	},
};
