import { StatusCodes } from "http-status-codes";
import type { z } from "zod";
import { outranks } from "@/config/roles";
import { audit, type RequestContext } from "@/lib/audit";
import { hashPassword } from "@/lib/auth";
import type { AuthenticatedUser } from "@/lib/types";
import { prisma } from "@/utils/prisma";
import { ServiceResponse } from "@/utils/serviceResponse";
import type {
	ChecklistItemSchema,
	CreateEligibilityRuleSchema,
	CreateUserSchema,
	CrmConnectSchema,
	CrmUpdatePermissionSchema,
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
type CrmConnectInput = z.infer<typeof CrmConnectSchema>["body"];
type CrmUpdatePermissionInput = z.infer<typeof CrmUpdatePermissionSchema>["body"];

/** Turn a stage display name into a stable, immutable key slug. */
function slugify(input: string): string {
	return input
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "_")
		.replace(/^_+|_+$/g, "")
		.slice(0, 50);
}

function roleLabel(role: string): string {
	if (role === "super_admin") return "Super Admin";
	if (role === "admin") return "Admin";
	return "VA";
}

const noContext: RequestContext = { ip: null, userAgent: null };

export const adminService = {
	// User management
	async listUsers() {
		const users = await prisma.user.findMany({
			select: {
				id: true,
				name: true,
				email: true,
				role: true,
				shift: true,
				status: true,
				lastLoginAt: true,
				createdAt: true,
				// Real avatar URL (Cloudinary) uploaded via the profile page, so the
				// user-management UI shows the person's photo instead of a letter.
				avatar: true,
				// Used by the user-management UI to block deleting a VA who still
				// has assigned patients (deleteUser enforces this server-side too).
				_count: { select: { assignedPatients: true } },
			},
			orderBy: { createdAt: "asc" },
		});
		return ServiceResponse.success("Users retrieved.", users);
	},

	async createUser(input: CreateUserInput, actor: AuthenticatedUser, ctx: RequestContext = noContext) {
		// task.md §17 "Add Admin": Super Admin (Yes), Admin (Restricted) — a plain
		// admin may create VAs but not fellow Admins (§6, permissions.ts users.add_admin).
		if (input.role === "admin" && actor.role !== "super_admin") {
			return ServiceResponse.failure("Only the Super Admin can create Admin accounts.", null, StatusCodes.FORBIDDEN);
		}

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
				createdById: actor.id,
			},
			select: { id: true, name: true, email: true, role: true, shift: true, status: true, createdAt: true },
		});

		// task.md §8: "User created → Who created → Role assigned → Timestamp".
		await audit({
			user: actor,
			action: "user_management.user_created",
			category: "user_management",
			entityType: "user",
			entityId: user.id,
			newValue: { name: user.name, email: user.email, role: user.role },
			message: `${actor.name} created ${roleLabel(user.role)} user ${user.name}`,
			ip: ctx.ip,
			userAgent: ctx.userAgent,
		});

		return ServiceResponse.success("User created.", user, StatusCodes.CREATED);
	},

	async updateUser(id: string, input: UpdateUserInput, actor: AuthenticatedUser, ctx: RequestContext = noContext) {
		const existing = await prisma.user.findUnique({ where: { id } });
		if (!existing) {
			return ServiceResponse.failure("User not found.", null, StatusCodes.NOT_FOUND);
		}

		// task.md §17 "Manage Super Admin: No/No/No" — the Super Admin account is
		// never editable through the ordinary user-management surface, by anyone,
		// including itself. (Self profile edits go through /auth/profile instead.)
		if (existing.role === "super_admin") {
			return ServiceResponse.failure(
				"The Super Admin account is protected and cannot be edited here.",
				null,
				StatusCodes.FORBIDDEN,
			);
		}

		if (id === actor.id) {
			// §18.8: users cannot modify their own role.
			if (input.role !== undefined && input.role !== existing.role) {
				return ServiceResponse.failure("You cannot change your own role.", null, StatusCodes.FORBIDDEN);
			}
			// Not an explicit task.md rule, but a direct corollary of "always retain
			// a valid admin path" — don't let anyone lock themselves out.
			if (input.status === "inactive") {
				return ServiceResponse.failure("You cannot deactivate your own account.", null, StatusCodes.FORBIDDEN);
			}
		}

		const data: Record<string, unknown> = {};
		const prev: Record<string, unknown> = {};
		const next: Record<string, unknown> = {};
		const changed: string[] = [];

		if (input.name !== undefined && input.name !== existing.name) {
			data.name = input.name;
			prev.name = existing.name;
			next.name = input.name;
			changed.push("name");
		}
		if (input.email !== undefined && input.email !== existing.email) {
			data.email = input.email;
			prev.email = existing.email;
			next.email = input.email;
			changed.push("email");
		}
		if (input.role !== undefined && input.role !== existing.role) {
			data.role = input.role;
			prev.role = existing.role;
			next.role = input.role;
			changed.push("role");
		}
		if (input.shift !== undefined && input.shift !== existing.shift) {
			data.shift = input.shift;
			prev.shift = existing.shift;
			next.shift = input.shift;
			changed.push("shift");
		}
		if (input.status !== undefined && input.status !== existing.status) {
			data.status = input.status;
			prev.status = existing.status;
			next.status = input.status;
			changed.push("status");
		}
		if (input.password !== undefined) {
			data.passwordHash = await hashPassword(input.password);
			changed.push("password");
		}

		const user = await prisma.user.update({
			where: { id },
			data,
			select: { id: true, name: true, email: true, role: true, shift: true, status: true, createdAt: true },
		});

		if (changed.length > 0) {
			// Distinct, more specific action id when activation/deactivation is the
			// whole change (task.md §2 tracks this as its own activity type).
			const action =
				changed.length === 1 && changed[0] === "status"
					? input.status === "inactive"
						? "user_management.user_deactivated"
						: "user_management.user_activated"
					: "user_management.user_updated";

			await audit({
				user: actor,
				action,
				category: "user_management",
				entityType: "user",
				entityId: id,
				prevValue: prev,
				newValue: next,
				message: `${actor.name} updated ${roleLabel(existing.role)} user ${existing.name} (${changed.join(", ")})`,
				ip: ctx.ip,
				userAgent: ctx.userAgent,
			});
		}

		return ServiceResponse.success("User updated.", user);
	},

	async deleteUser(id: string, actor: AuthenticatedUser, ctx: RequestContext = noContext) {
		const existing = await prisma.user.findUnique({ where: { id } });
		if (!existing) {
			return ServiceResponse.failure("User not found.", null, StatusCodes.NOT_FOUND);
		}

		// §10 / §18.1 — a user can never delete their own account, even via a
		// direct API call.
		if (id === actor.id) {
			return ServiceResponse.failure("You cannot delete your own account.", null, StatusCodes.FORBIDDEN);
		}
		// §11 / §18.2 — the Super Admin account can never be deleted, by anyone,
		// from any surface.
		if (existing.role === "super_admin") {
			return ServiceResponse.failure("The Super Admin account cannot be deleted.", null, StatusCodes.FORBIDDEN);
		}
		// §17 "Delete Admin": only super_admin (Yes) may delete an admin — a plain
		// admin (No) may not. "Delete VA": admin or super_admin (Yes) may. In
		// general the actor must strictly outrank the target; a VA actor never
		// reaches this line at all (blocked at the router by requireRole("admin")).
		if (!outranks(actor.role, existing.role)) {
			return ServiceResponse.failure(
				"You do not have permission to delete a user with this role.",
				null,
				StatusCodes.FORBIDDEN,
			);
		}

		// Deleting a user who still has patients assigned would orphan those
		// patients (they'd silently fall out of every VA's scope). The admin must
		// reassign them to another VA first. Counted at delete-time so a stale
		// frontend list can never bypass this.
		const assignedCount = await prisma.patient.count({ where: { assignedTo: id } });
		if (assignedCount > 0) {
			return ServiceResponse.failure(
				`Cannot delete ${existing.name}: ${assignedCount} patient${assignedCount === 1 ? " is" : "s are"} still assigned to ${existing.role === "va" ? "this VA" : "this account"}. Reassign ${assignedCount === 1 ? "the patient" : "those patients"} to another VA first.`,
				null,
				StatusCodes.CONFLICT,
			);
		}

		await prisma.user.delete({ where: { id } });

		await audit({
			user: actor,
			action: "user_management.user_deleted",
			category: "user_management",
			entityType: "user",
			entityId: id,
			prevValue: { name: existing.name, email: existing.email, role: existing.role },
			message: `${actor.name} deleted ${roleLabel(existing.role)} user ${existing.name}`,
			ip: ctx.ip,
			userAgent: ctx.userAgent,
		});

		return ServiceResponse.success("User deleted.", null);
	},

	// Stage management
	async listStages() {
		const stages = await prisma.stage.findMany({ orderBy: { sortOrder: "asc" } });
		return ServiceResponse.success("Stages retrieved.", stages);
	},

	async createStage(input: CreateStageInput, actor: AuthenticatedUser, ctx: RequestContext = noContext) {
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

		await audit({
			user: actor,
			action: "system.stage_created",
			category: "system",
			entityType: "stage",
			entityId: stage.key,
			newValue: { name: stage.name, isFinal: stage.isFinal, isActive: stage.isActive },
			message: `${actor.name} created pipeline stage "${stage.name}"`,
			ip: ctx.ip,
			userAgent: ctx.userAgent,
		});

		return ServiceResponse.success("Stage created.", stage, StatusCodes.CREATED);
	},

	async updateStage(key: string, input: UpdateStageInput, actor: AuthenticatedUser, ctx: RequestContext = noContext) {
		const stage = await prisma.stage.findUnique({ where: { key } });
		if (!stage) {
			return ServiceResponse.failure("Stage not found.", null, StatusCodes.NOT_FOUND);
		}

		const data: Record<string, unknown> = {};
		const prev: Record<string, unknown> = {};
		const next: Record<string, unknown> = {};
		if (input.name !== undefined && input.name.trim() !== stage.name) {
			data.name = input.name.trim();
			prev.name = stage.name;
			next.name = data.name;
		}
		if (input.hint !== undefined) {
			const hint = input.hint?.trim() || null;
			if (hint !== stage.hint) {
				data.hint = hint;
				prev.hint = stage.hint;
				next.hint = hint;
			}
		}
		if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder;
		if (input.isFinal !== undefined && input.isFinal !== stage.isFinal) {
			data.isFinal = input.isFinal;
			prev.isFinal = stage.isFinal;
			next.isFinal = input.isFinal;
		}
		if (input.isActive !== undefined && input.isActive !== stage.isActive) {
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
			prev.isActive = stage.isActive;
			next.isActive = input.isActive;
		}

		const updated = await prisma.stage.update({ where: { key }, data });

		if (Object.keys(next).length > 0) {
			await audit({
				user: actor,
				action: "system.stage_updated",
				category: "system",
				entityType: "stage",
				entityId: key,
				prevValue: prev,
				newValue: next,
				message: `${actor.name} updated pipeline stage "${stage.name}" (${Object.keys(next).join(", ")})`,
				ip: ctx.ip,
				userAgent: ctx.userAgent,
			});
		}

		return ServiceResponse.success("Stage updated.", updated);
	},

	async reorderStages(input: StageReorderInput, actor: AuthenticatedUser, ctx: RequestContext = noContext) {
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

		await audit({
			user: actor,
			action: "system.stage_reordered",
			category: "system",
			entityType: "stage",
			newValue: { order: input.keys },
			message: `${actor.name} reordered pipeline stages`,
			ip: ctx.ip,
			userAgent: ctx.userAgent,
		});

		return ServiceResponse.success("Stage order updated.", null);
	},

	async deleteStage(key: string, actor: AuthenticatedUser, ctx: RequestContext = noContext) {
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

		await audit({
			user: actor,
			action: "system.stage_deleted",
			category: "system",
			entityType: "stage",
			entityId: key,
			prevValue: { name: stage.name },
			message: `${actor.name} deleted pipeline stage "${stage.name}"`,
			ip: ctx.ip,
			userAgent: ctx.userAgent,
		});

		return ServiceResponse.success("Stage deleted.", null);
	},

	// Checklist management
	async createChecklistItem(input: ChecklistItemInput, actor: AuthenticatedUser, ctx: RequestContext = noContext) {
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

		await audit({
			user: actor,
			action: "system.checklist_item_created",
			category: "system",
			entityType: "checklist_item",
			entityId: item.id,
			newValue: { stage: item.stage, label: item.label, status: item.status },
			message: `${actor.name} added checklist item "${item.label}" to stage "${stage.name}"`,
			ip: ctx.ip,
			userAgent: ctx.userAgent,
		});

		return ServiceResponse.success("Checklist item created.", item, StatusCodes.CREATED);
	},

	async listChecklistItems() {
		const items = await prisma.checklistItem.findMany({
			orderBy: [{ stage: "asc" }, { sortOrder: "asc" }],
		});
		return ServiceResponse.success("Checklist items retrieved.", items);
	},

	async deleteChecklistItem(id: string, actor: AuthenticatedUser, ctx: RequestContext = noContext) {
		const item = await prisma.checklistItem.findUnique({ where: { id } });
		if (!item) {
			return ServiceResponse.failure("Checklist item not found.", null, StatusCodes.NOT_FOUND);
		}
		if (item.isDefault) {
			return ServiceResponse.failure("Cannot delete default checklist items.", null, StatusCodes.BAD_REQUEST);
		}
		await prisma.checklistItem.delete({ where: { id } });

		await audit({
			user: actor,
			action: "system.checklist_item_deleted",
			category: "system",
			entityType: "checklist_item",
			entityId: id,
			prevValue: { stage: item.stage, label: item.label },
			message: `${actor.name} removed checklist item "${item.label}" from stage "${item.stage}"`,
			ip: ctx.ip,
			userAgent: ctx.userAgent,
		});

		return ServiceResponse.success("Checklist item deleted.", null);
	},

	async updateChecklistItem(
		id: string,
		input: UpdateChecklistItemInput,
		actor: AuthenticatedUser,
		ctx: RequestContext = noContext,
	) {
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

		const prev: Record<string, unknown> = {};
		const next: Record<string, unknown> = {};
		if (input.stage !== undefined && input.stage !== item.stage) {
			prev.stage = item.stage;
			next.stage = input.stage;
		}
		if (input.label !== undefined && input.label !== item.label) {
			prev.label = item.label;
			next.label = input.label;
		}
		if (input.status !== undefined && input.status !== item.status) {
			prev.status = item.status;
			next.status = input.status;
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

		if (Object.keys(next).length > 0) {
			await audit({
				user: actor,
				action: "system.checklist_item_updated",
				category: "system",
				entityType: "checklist_item",
				entityId: id,
				prevValue: prev,
				newValue: next,
				message: `${actor.name} updated checklist item "${item.label}" (${Object.keys(next).join(", ")})`,
				ip: ctx.ip,
				userAgent: ctx.userAgent,
			});
		}

		return ServiceResponse.success("Checklist item updated.", updated);
	},

	// Eligibility rule management
	async listEligibilityRules() {
		const rules = await prisma.eligibilityRule.findMany({
			orderBy: { createdAt: "asc" },
		});
		return ServiceResponse.success("Eligibility rules retrieved.", rules);
	},

	async createEligibilityRule(
		input: CreateEligibilityRuleInput,
		actor: AuthenticatedUser,
		ctx: RequestContext = noContext,
	) {
		const rule = await prisma.eligibilityRule.create({
			data: {
				label: input.label,
				field: input.field,
				operator: input.operator,
				value: input.value ?? null,
				isActive: input.isActive,
			},
		});

		await audit({
			user: actor,
			action: "system.eligibility_rule_created",
			category: "system",
			entityType: "eligibility_rule",
			entityId: rule.id,
			newValue: { label: rule.label, field: rule.field, operator: rule.operator, value: rule.value },
			message: `${actor.name} created eligibility rule "${rule.label}"`,
			ip: ctx.ip,
			userAgent: ctx.userAgent,
		});

		return ServiceResponse.success("Eligibility rule created.", rule, StatusCodes.CREATED);
	},

	async updateEligibilityRule(
		id: string,
		input: UpdateEligibilityRuleInput,
		actor: AuthenticatedUser,
		ctx: RequestContext = noContext,
	) {
		const rule = await prisma.eligibilityRule.findUnique({ where: { id } });
		if (!rule) {
			return ServiceResponse.failure("Eligibility rule not found.", null, StatusCodes.NOT_FOUND);
		}

		const prev: Record<string, unknown> = {};
		const next: Record<string, unknown> = {};
		for (const field of ["label", "field", "operator", "value", "isActive"] as const) {
			if (input[field] !== undefined && input[field] !== rule[field]) {
				prev[field] = rule[field];
				next[field] = input[field];
			}
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

		if (Object.keys(next).length > 0) {
			await audit({
				user: actor,
				action: "system.eligibility_rule_updated",
				category: "system",
				entityType: "eligibility_rule",
				entityId: id,
				prevValue: prev,
				newValue: next,
				message: `${actor.name} updated eligibility rule "${rule.label}" (${Object.keys(next).join(", ")})`,
				ip: ctx.ip,
				userAgent: ctx.userAgent,
			});
		}

		return ServiceResponse.success("Eligibility rule updated.", updated);
	},

	async deleteEligibilityRule(id: string, actor: AuthenticatedUser, ctx: RequestContext = noContext) {
		const rule = await prisma.eligibilityRule.findUnique({ where: { id } });
		if (!rule) {
			return ServiceResponse.failure("Eligibility rule not found.", null, StatusCodes.NOT_FOUND);
		}

		await prisma.eligibilityRule.delete({ where: { id } });

		await audit({
			user: actor,
			action: "system.eligibility_rule_deleted",
			category: "system",
			entityType: "eligibility_rule",
			entityId: id,
			prevValue: { label: rule.label },
			message: `${actor.name} deleted eligibility rule "${rule.label}"`,
			ip: ctx.ip,
			userAgent: ctx.userAgent,
		});

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

	// CRM Connect settings (config-crm page). "Connect" simulates a successful
	// handshake — no real Optimantra/GoHighLevel API call is made. Only a
	// masked preview of the key is ever persisted, never the raw value.
	async getCrmIntegration() {
		const integration = await prisma.crmIntegration.findFirst({
			orderBy: { updatedAt: "desc" },
			include: { connectedByUser: { select: { id: true, name: true } } },
		});
		return ServiceResponse.success("CRM integration retrieved.", integration);
	},

	async connectCrm(input: CrmConnectInput, user: AuthenticatedUser, ctx: RequestContext = noContext) {
		const apiKeyLast4 = input.apiKey.trim().slice(-4);

		// Simulated handshake — a real integration would call the provider's API here.
		await new Promise((resolve) => setTimeout(resolve, 600));

		const existing = await prisma.crmIntegration.findFirst({ orderBy: { updatedAt: "desc" } });
		const integration = existing
			? await prisma.crmIntegration.update({
					where: { id: existing.id },
					data: {
						provider: input.provider,
						apiKeyLast4,
						permission: input.permission,
						status: "connected",
						connectedById: user.id,
						connectedAt: new Date(),
					},
					include: { connectedByUser: { select: { id: true, name: true } } },
				})
			: await prisma.crmIntegration.create({
					data: {
						provider: input.provider,
						apiKeyLast4,
						permission: input.permission,
						status: "connected",
						connectedById: user.id,
						connectedAt: new Date(),
					},
					include: { connectedByUser: { select: { id: true, name: true } } },
				});

		// Only the masked last-4 is ever logged, never the raw API key.
		await audit({
			user,
			action: "system.crm_connected",
			category: "system",
			entityType: "crm_integration",
			entityId: integration.id,
			newValue: { provider: input.provider, apiKeyLast4, permission: input.permission },
			message: `${user.name} connected CRM integration (${input.provider})`,
			ip: ctx.ip,
			userAgent: ctx.userAgent,
		});

		return ServiceResponse.success("CRM connected.", integration);
	},

	async disconnectCrm(actor: AuthenticatedUser, ctx: RequestContext = noContext) {
		const existing = await prisma.crmIntegration.findFirst({ orderBy: { updatedAt: "desc" } });
		if (!existing) {
			return ServiceResponse.failure("No CRM integration found.", null, StatusCodes.NOT_FOUND);
		}
		const integration = await prisma.crmIntegration.update({
			where: { id: existing.id },
			data: { status: "disconnected", connectedById: null, connectedAt: null },
		});

		await audit({
			user: actor,
			action: "system.crm_disconnected",
			category: "system",
			entityType: "crm_integration",
			entityId: existing.id,
			prevValue: { provider: existing.provider },
			message: `${actor.name} disconnected CRM integration (${existing.provider})`,
			ip: ctx.ip,
			userAgent: ctx.userAgent,
		});

		return ServiceResponse.success("CRM disconnected.", integration);
	},

	async updateCrmPermission(
		input: CrmUpdatePermissionInput,
		actor: AuthenticatedUser,
		ctx: RequestContext = noContext,
	) {
		const existing = await prisma.crmIntegration.findFirst({ orderBy: { updatedAt: "desc" } });
		if (!existing) {
			return ServiceResponse.failure("No CRM integration found.", null, StatusCodes.NOT_FOUND);
		}
		const integration = await prisma.crmIntegration.update({
			where: { id: existing.id },
			data: { permission: input.permission },
		});

		await audit({
			user: actor,
			action: "system.crm_permission_updated",
			category: "system",
			entityType: "crm_integration",
			entityId: existing.id,
			prevValue: { permission: existing.permission },
			newValue: { permission: input.permission },
			message: `${actor.name} changed CRM permission to "${input.permission}"`,
			ip: ctx.ip,
			userAgent: ctx.userAgent,
		});

		return ServiceResponse.success("Permission updated.", integration);
	},
};
