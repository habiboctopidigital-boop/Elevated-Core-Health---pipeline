import { StatusCodes } from "http-status-codes";

import { isChecklistComplete } from "@/config/checklists";
import { getFirstStageKey, getStageOrder } from "@/config/stages";
import { audit } from "@/lib/audit";
import type { AuthenticatedUser } from "@/lib/types";
import { emailService } from "@/services/email.service";
import { logger } from "@/utils/logger";
import { prisma } from "@/utils/prisma";
import { ServiceResponse } from "@/utils/serviceResponse";
import type {
	AssignInput,
	CheckEligibilityInput,
	ChecklistToggleInput,
	ClaimInput,
	ClearFlagInput,
	FlagInput,
	IntakeInput,
	NotesInput,
	StageMoveInput,
	UpdatePatientInput,
	UpdateStatusInput,
	UpdateAppointmentInput,
} from "./patients.validation";

/**
 * Server-side simulated verification of benefits. In a later phase this will
 * call a real payer/clearinghouse API; for now it synthesizes realistic values
 * from the patient's stored payment data so the eligibility flow can be tested.
 */
function simulateVobSnapshot(
	patient: { id: string; insuranceProvider: string | null },
	input: Partial<{ insuranceProvider: string | null }> = {},
) {
	const payer = patient.insuranceProvider || input.insuranceProvider || "Blue Cross Blue Shield";
	const idTail = patient.id.replace(/-/g, "").slice(0, 8).toUpperCase();
	return {
		coverage: "Active",
		payer,
		memberId: `ECH${idTail}`,
		groupNumber: `G${idTail.slice(0, 6)}`,
		copay: "$30",
		coinsurance: "20%",
		deductible: "$1,500",
		deductibleMet: "$750",
		outOfPocketMax: "$5,000",
		authorizationRequired: false,
		visitsCoveredPerYear: "Unlimited",
		checkDate: new Date().toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric",
		}),
	};
}

/** Resolve a rule's target field against the combined eligibility profile. */
function resolveField(profile: Record<string, unknown>, field: string): string {
	const key = field.trim().toLowerCase();
	if (key in profile) {
		const v = profile[key];
		return v === null || v === undefined ? "" : String(v);
	}
	// Support dotted paths into nested objects (e.g. paymentDetails.coverage)
	const parts = key.split(".");
	let cur: unknown = profile;
	for (const part of parts) {
		if (cur && typeof cur === "object" && part in (cur as Record<string, unknown>)) {
			cur = (cur as Record<string, unknown>)[part];
		} else {
			return "";
		}
	}
	return cur === null || cur === undefined ? "" : String(cur);
}

function evaluateRule(
	rule: { label: string; field: string; operator: string; value: string | null },
	profile: Record<string, unknown>,
): boolean {
	const actual = resolveField(profile, rule.field).trim();
	const expected = (rule.value ?? "").trim();
	switch (rule.operator) {
		case "is_not_empty":
			return actual.length > 0;
		case "equals":
			return actual.toLowerCase() === expected.toLowerCase();
		case "contains":
			return expected.length > 0 && actual.toLowerCase().includes(expected.toLowerCase());
		case "is_empty":
			return actual.length === 0;
		default:
			return true;
	}
}

/**
 * Shared-editing rule (Phase 3): board is open by default — admins and any VA
 * can work any patient. The ONLY restriction is a privacy lock set by the
 * assigned VA (or admin); admins always bypass it.
 */
function canEditPatient(
	patient: { isPrivate: boolean; privateLockedById: string | null; assignedTo: string | null },
	user: AuthenticatedUser,
): boolean {
	if (user.role === "admin") return true;
	if (patient.isPrivate) {
		if (patient.assignedTo === user.id) return true;
		if (patient.privateLockedById && patient.privateLockedById === user.id) return true;
		return false;
	}
	return true;
}

const patientInclude = {
	assignedUser: { select: { id: true, name: true } },
	flaggedByUser: { select: { id: true, name: true } },
	flagClearedByUser: { select: { id: true, name: true } },
	cancelledByUser: { select: { id: true, name: true } },
	privateLockedByUser: { select: { id: true, name: true } },
	// Full flag history (newest first). The patient row keeps its single
	// "currently flagged" snapshot for cheap board badges; this array feeds
	// the modal's latest-flag + count + view-all list.
	flags: {
		orderBy: { createdAt: "desc" },
		include: {
			flaggedByUser: { select: { id: true, name: true } },
			clearedByUser: { select: { id: true, name: true } },
		},
	},
} as const;

export const patientsService = {
	async list(stage?: string) {
		const where = stage ? { stage } : {};
		const patients = await prisma.patient.findMany({
			where,
			orderBy: { updatedAt: "desc" },
			include: patientInclude,
		});
		return ServiceResponse.success("Patients retrieved.", patients);
	},

	async getById(id: string) {
		const patient = await prisma.patient.findUnique({
			where: { id },
			include: {
				...patientInclude,
				activityLogs: { orderBy: { createdAt: "desc" }, take: 50 },
			},
		});
		if (!patient) {
			return ServiceResponse.failure("Patient not found.", null, StatusCodes.NOT_FOUND);
		}
		return ServiceResponse.success("Patient retrieved.", patient);
	},

	async moveStage(id: string, input: StageMoveInput, user: AuthenticatedUser) {
		const patient = await prisma.patient.findUnique({ where: { id } });
		if (!patient) {
			return ServiceResponse.failure("Patient not found.", null, StatusCodes.NOT_FOUND);
		}

		if (!canEditPatient(patient, user)) {
			return ServiceResponse.failure(
				"This patient is locked by the assigned VA. Only they or an admin can move it.",
				null,
				StatusCodes.FORBIDDEN,
			);
		}

		const order = await getStageOrder();
		if (!order.includes(input.targetStage)) {
			return ServiceResponse.failure("Target stage does not exist or is disabled.", null, StatusCodes.BAD_REQUEST);
		}

		const curIdx = order.indexOf(patient.stage);
		const tgtIdx = order.indexOf(input.targetStage);

		if (tgtIdx - curIdx > 1) {
			return ServiceResponse.failure(
				"Cannot skip stages. Move forward one stage at a time.",
				null,
				StatusCodes.BAD_REQUEST,
			);
		}

		if (tgtIdx > curIdx) {
			const allState = (patient.checklistState ?? {}) as Record<string, Record<string, boolean>>;
			const stageState = allState[patient.stage] ?? {};
			const complete = await isChecklistComplete(patient.stage, stageState);
			if (!complete) {
				return ServiceResponse.failure(
					"Please complete all checklist items before moving to the next stage.",
					null,
					StatusCodes.BAD_REQUEST,
				);
			}
		}

		// Auto-complete: entering a final stage marks the patient Completed;
		// leaving a final stage while Completed reverts to Active.
		const targetStage = await prisma.stage.findUnique({
			where: { key: input.targetStage },
			select: { isFinal: true },
		});
		const data: Record<string, unknown> = { stage: input.targetStage, updatedAt: new Date(), updatedById: user.id };
		if (targetStage?.isFinal && patient.status !== "cancelled") {
			data.status = "completed";
			data.completedAt = new Date();
		} else if (patient.status === "completed" && !targetStage?.isFinal) {
			data.status = "active";
			data.completedAt = null;
		}

		const updated = await prisma.patient.update({ where: { id }, data });

		await audit({
			patientId: id,
			user,
			action: "stage.move",
			entityType: "stage",
			entityId: input.targetStage,
			prevValue: { stage: patient.stage },
			newValue: { stage: input.targetStage },
			message: `Moved from ${patient.stage} to ${input.targetStage}`,
			type: "auto",
		});

		return ServiceResponse.success("Stage updated.", updated);
	},

	async assign(id: string, input: AssignInput, user: AuthenticatedUser) {
		const patient = await prisma.patient.findUnique({ where: { id } });
		if (!patient) {
			return ServiceResponse.failure("Patient not found.", null, StatusCodes.NOT_FOUND);
		}

		// Lock-aware: a VA must never self-assign a locked patient to bypass the lock.
		if (!canEditPatient(patient, user)) {
			return ServiceResponse.failure(
				"This patient is locked by the assigned VA. Only they or an admin can assign it.",
				null,
				StatusCodes.FORBIDDEN,
			);
		}

		const updated = await prisma.patient.update({
			where: { id },
			data: { assignedTo: input.assignedTo, updatedAt: new Date(), updatedById: user.id },
		});

		const assignedName = input.assignedTo
			? (await prisma.user.findUnique({ where: { id: input.assignedTo }, select: { name: true } }))?.name
			: null;

		await audit({
			patientId: id,
			user,
			action: "assignment.change",
			entityType: "patient",
			entityId: id,
			prevValue: { assignedTo: patient.assignedTo },
			newValue: { assignedTo: input.assignedTo, name: assignedName },
			message: assignedName ? `Assigned patient to ${assignedName}` : "Unassigned patient",
		});

		return ServiceResponse.success("Assignment updated.", updated);
	},

	async toggleChecklist(id: string, input: ChecklistToggleInput, user: AuthenticatedUser) {
		const patient = await prisma.patient.findUnique({ where: { id } });
		if (!patient) {
			return ServiceResponse.failure("Patient not found.", null, StatusCodes.NOT_FOUND);
		}

		if (!canEditPatient(patient, user)) {
			return ServiceResponse.failure(
				"This patient is locked by the assigned VA. Only they or an admin can update it.",
				null,
				StatusCodes.FORBIDDEN,
			);
		}

		const state = { ...((patient.checklistState ?? {}) as Record<string, Record<string, boolean>>) };

		const currentStage = patient.stage;
		if (!state[currentStage]) {
			state[currentStage] = {};
		}
		state[currentStage][input.itemId] = input.checked;

		const item = await prisma.checklistItem.findUnique({ where: { id: input.itemId } });

		const updated = await prisma.patient.update({
			where: { id },
			data: { checklistState: state, updatedAt: new Date(), updatedById: user.id },
		});

		const action = input.checked ? "checked" : "unchecked";
		const label = item?.label ?? input.itemId;
		await audit({
			patientId: id,
			user,
			action: "checklist.toggle",
			entityType: "checklist_item",
			entityId: input.itemId,
			prevValue: { checked: !input.checked },
			newValue: { checked: input.checked },
			metadata: { stage: currentStage, label },
			message: `Checklist item "${label}" ${action}`,
			type: "auto",
		});

		return ServiceResponse.success("Checklist updated.", updated);
	},

	async updateNotes(id: string, input: NotesInput, user: AuthenticatedUser) {
		const patient = await prisma.patient.findUnique({ where: { id } });
		if (!patient) {
			return ServiceResponse.failure("Patient not found.", null, StatusCodes.NOT_FOUND);
		}

		if (!canEditPatient(patient, user)) {
			return ServiceResponse.failure(
				"This patient is locked by the assigned VA. Only they or an admin can update it.",
				null,
				StatusCodes.FORBIDDEN,
			);
		}

		const updated = await prisma.patient.update({
			where: { id },
			data: { notes: input.notes, updatedAt: new Date(), updatedById: user.id },
		});

		await audit({
			patientId: id,
			user,
			action: "notes.update",
			entityType: "patient",
			entityId: id,
			prevValue: { notes: patient.notes },
			newValue: { notes: input.notes },
			message: `Note updated: "${input.notes.slice(0, 60)}${input.notes.length > 60 ? "..." : ""}"`,
		});

		return ServiceResponse.success("Notes updated.", updated);
	},

	async flag(id: string, input: FlagInput, user: AuthenticatedUser) {
		const patient = await prisma.patient.findUnique({ where: { id } });
		if (!patient) {
			return ServiceResponse.failure("Patient not found.", null, StatusCodes.NOT_FOUND);
		}

		const updated = await prisma.patient.update({
			where: { id },
			data: {
				isFlagged: true,
				flagReason: input.reason,
				flaggedById: user.id,
				flaggedAt: new Date(),
				updatedAt: new Date(),
				updatedById: user.id,
			},
		});

		// Write the flag into history (kept in sync with the patient snapshot).
		await prisma.patientFlag.create({
			data: {
				patientId: id,
				stage: patient.stage,
				type: input.type ?? "negative",
				reason: input.reason,
				flaggedById: user.id,
			},
		});

		await audit({
			patientId: id,
			user,
			action: "flag.create",
			entityType: "patient",
			entityId: id,
			prevValue: { isFlagged: false },
			newValue: { isFlagged: true, reason: input.reason },
			message: `Flagged for Donna: ${input.reason}`,
		});

		try {
			const admin = await prisma.user.findFirst({ where: { role: "admin" }, select: { email: true } });
			if (admin) {
				await emailService.notifyFlagged(patient.name, user.name, input.reason, admin.email);
			}
		} catch (err) {
			logger.error({ err, patientId: id }, "Failed to send flag notification email");
		}

		return ServiceResponse.success("Patient flagged.", updated);
	},

	async clearFlag(id: string, input: ClearFlagInput, user: AuthenticatedUser) {
		const patient = await prisma.patient.findUnique({
			where: { id },
			include: { flaggedByUser: { select: { email: true, name: true } } },
		});
		if (!patient) {
			return ServiceResponse.failure("Patient not found.", null, StatusCodes.NOT_FOUND);
		}

		const updated = await prisma.patient.update({
			where: { id },
			data: {
				isFlagged: false,
				flagReason: null,
				flaggedById: null,
				flaggedAt: null,
				flagClearedReason: input.clearReason,
				flagClearedById: user.id,
				flagClearedAt: new Date(),
				updatedAt: new Date(),
				updatedById: user.id,
			},
		});

		// Mark the most recent open flag record as cleared in history.
		await prisma.patientFlag.updateMany({
			where: { patientId: id, clearedAt: null },
			data: {
				clearedById: user.id,
				clearedReason: input.clearReason,
				clearedAt: new Date(),
			},
		});

		await audit({
			patientId: id,
			user,
			action: "flag.clear",
			entityType: "patient",
			entityId: id,
			prevValue: { isFlagged: true },
			newValue: { isFlagged: false, reason: input.clearReason },
			message: `Flag cleared — ${input.clearReason}`,
		});

		// Email the original flagger with Donna's feedback
		try {
			if (patient.flaggedByUser?.email) {
				await emailService.notifyFlagCleared(patient.name, user.name, input.clearReason, patient.flaggedByUser.email);
			}
		} catch (err) {
			logger.error({ err, patientId: id }, "Failed to send flag-cleared notification email");
		}

		return ServiceResponse.success("Flag cleared.", updated);
	},

	async deletePatient(id: string) {
		const patient = await prisma.patient.findUnique({ where: { id } });
		if (!patient) {
			return ServiceResponse.failure("Patient not found.", null, StatusCodes.NOT_FOUND);
		}

		await prisma.patient.delete({ where: { id } });
		return ServiceResponse.success("Patient deleted.", null);
	},

	async updatePatient(id: string, input: UpdatePatientInput, user: AuthenticatedUser) {
		const patient = await prisma.patient.findUnique({ where: { id } });
		if (!patient) {
			return ServiceResponse.failure("Patient not found.", null, StatusCodes.NOT_FOUND);
		}

		if (!canEditPatient(patient, user)) {
			return ServiceResponse.failure(
				"This patient is locked by the assigned VA. Only they or an admin can update it.",
				null,
				StatusCodes.FORBIDDEN,
			);
		}

		const data: Record<string, unknown> = {};
		const prev: Record<string, unknown> = {};
		const next: Record<string, unknown> = {};

		const firstName = input.firstName !== undefined ? (input.firstName ?? null) : null;
		const lastName = input.lastName !== undefined ? (input.lastName ?? null) : null;
		if (input.firstName !== undefined) {
			data.firstName = input.firstName;
			prev.firstName = patient.firstName;
			next.firstName = input.firstName;
		}
		if (input.lastName !== undefined) {
			data.lastName = input.lastName;
			prev.lastName = patient.lastName;
			next.lastName = input.lastName;
		}
		// Keep the display `name` in sync when name parts change.
		if (input.firstName !== undefined || input.lastName !== undefined) {
			const derived = `${firstName ?? patient.firstName ?? ""} ${lastName ?? patient.lastName ?? ""}`.trim();
			if (derived) data.name = derived;
		}
		if (input.location !== undefined) {
			data.location = input.location;
			prev.location = patient.location;
			next.location = input.location;
		}
		if (input.email !== undefined) {
			data.email = input.email;
			prev.email = patient.email;
			next.email = input.email;
		}
		if (input.phone !== undefined) {
			data.phone = input.phone;
			prev.phone = patient.phone;
			next.phone = input.phone;
		}
		if (input.copayAmount !== undefined) {
			data.copayAmount = input.copayAmount === null || input.copayAmount === "" ? null : String(input.copayAmount);
			prev.copayAmount = patient.copayAmount?.toString() ?? null;
			next.copayAmount = data.copayAmount;
		}
		if (input.amountPaid !== undefined) {
			data.amountPaid = input.amountPaid === null || input.amountPaid === "" ? null : String(input.amountPaid);
			prev.amountPaid = patient.amountPaid?.toString() ?? null;
			next.amountPaid = data.amountPaid;
		}
		if (input.paymentMethod !== undefined) {
			data.paymentMethod = input.paymentMethod;
			prev.paymentMethod = patient.paymentMethod;
			next.paymentMethod = input.paymentMethod;
		}
		if (input.insuranceProvider !== undefined) {
			data.insuranceProvider = input.insuranceProvider;
			prev.insuranceProvider = patient.insuranceProvider;
			next.insuranceProvider = input.insuranceProvider;
		}
		if (input.visitStatus !== undefined) {
			data.visitStatus = input.visitStatus;
			prev.visitStatus = patient.visitStatus;
			next.visitStatus = input.visitStatus;
		}

		data.updatedAt = new Date();
		data.updatedById = user.id;

		const updated = await prisma.patient.update({ where: { id }, data });

		await audit({
			patientId: id,
			user,
			action: "patient.update",
			entityType: "patient",
			entityId: id,
			prevValue: prev,
			newValue: next,
			message: "Updated patient details",
		});

		return ServiceResponse.success("Patient updated.", updated);
	},

	async lockPatient(id: string, user: AuthenticatedUser) {
		const patient = await prisma.patient.findUnique({ where: { id } });
		if (!patient) {
			return ServiceResponse.failure("Patient not found.", null, StatusCodes.NOT_FOUND);
		}

		if (user.role !== "admin" && patient.assignedTo !== user.id) {
			return ServiceResponse.failure(
				"Only the assigned VA or an admin can lock this patient.",
				null,
				StatusCodes.FORBIDDEN,
			);
		}

		const updated = await prisma.patient.update({
			where: { id },
			data: {
				isPrivate: true,
				privateLockedById: user.id,
				privateLockedAt: new Date(),
				updatedAt: new Date(),
				updatedById: user.id,
			},
		});

		await audit({
			patientId: id,
			user,
			action: "lock.set",
			entityType: "patient",
			entityId: id,
			prevValue: { isPrivate: false },
			newValue: { isPrivate: true },
			message: "Locked patient — only the assigned VA or an admin can edit",
		});

		return ServiceResponse.success("Patient locked.", updated);
	},

	async unlockPatient(id: string, user: AuthenticatedUser) {
		const patient = await prisma.patient.findUnique({ where: { id } });
		if (!patient) {
			return ServiceResponse.failure("Patient not found.", null, StatusCodes.NOT_FOUND);
		}

		const canUnlock = user.role === "admin" || patient.assignedTo === user.id || patient.privateLockedById === user.id;
		if (!canUnlock) {
			return ServiceResponse.failure(
				"Only the assigned VA, the person who locked it, or an admin can unlock this patient.",
				null,
				StatusCodes.FORBIDDEN,
			);
		}

		const updated = await prisma.patient.update({
			where: { id },
			data: {
				isPrivate: false,
				privateLockedById: null,
				privateLockedAt: null,
				updatedAt: new Date(),
				updatedById: user.id,
			},
		});

		await audit({
			patientId: id,
			user,
			action: "lock.clear",
			entityType: "patient",
			entityId: id,
			prevValue: { isPrivate: true },
			newValue: { isPrivate: false },
			message: "Unlocked patient — open for all VAs again",
		});

		return ServiceResponse.success("Patient unlocked.", updated);
	},

	async updateStatus(id: string, input: UpdateStatusInput, user: AuthenticatedUser) {
		if (user.role !== "admin") {
			return ServiceResponse.failure("Only admins can change patient status.", null, StatusCodes.FORBIDDEN);
		}

		const patient = await prisma.patient.findUnique({ where: { id } });
		if (!patient) {
			return ServiceResponse.failure("Patient not found.", null, StatusCodes.NOT_FOUND);
		}

		const data: Record<string, unknown> = { status: input.status, updatedAt: new Date(), updatedById: user.id };
		if (input.status === "cancelled") {
			data.cancelledAt = new Date();
			data.cancelledById = user.id;
			data.cancelledReason = input.reason ?? null;
			data.completedAt = null;
		} else if (input.status === "active") {
			data.cancelledAt = null;
			data.cancelledById = null;
			data.cancelledReason = null;
		}

		const updated = await prisma.patient.update({ where: { id }, data });

		await audit({
			patientId: id,
			user,
			action: "status.update",
			entityType: "patient",
			entityId: id,
			prevValue: { status: patient.status },
			newValue: { status: input.status, reason: input.reason ?? null },
			message: `Status changed from ${patient.status} to ${input.status}${input.reason ? ` — ${input.reason}` : ""}`,
		});

		return ServiceResponse.success("Status updated.", updated);
	},

	async claim(id: string, input: ClaimInput, user: AuthenticatedUser) {
		const patient = await prisma.patient.findUnique({ where: { id } });
		if (!patient) {
			return ServiceResponse.failure("Patient not found.", null, StatusCodes.NOT_FOUND);
		}

		if (patient.assignedTo) {
			return ServiceResponse.failure("Patient is already assigned.", null, StatusCodes.CONFLICT);
		}

		const updated = await prisma.patient.update({
			where: { id },
			data: { assignedTo: input.userId, updatedAt: new Date(), updatedById: user.id },
		});

		await audit({
			patientId: id,
			user,
			action: "assignment.claim",
			entityType: "patient",
			entityId: id,
			prevValue: { assignedTo: null },
			newValue: { assignedTo: input.userId },
			message: `Claimed responsibility for patient`,
		});

		try {
			const vas = await prisma.user.findMany({ where: { role: "va" }, select: { id: true, name: true, email: true } });
			const otherVa = vas.find((v) => v.id !== input.userId);
			if (otherVa) {
				await emailService.notifyClaimed(patient.name, user.name, otherVa.email);
			}
		} catch (err) {
			logger.error({ err, patientId: id }, "Failed to send claim notification email");
		}

		return ServiceResponse.success("Patient claimed.", updated);
	},

	async listChecklistItems() {
		const items = await prisma.checklistItem.findMany({
			orderBy: [{ stage: "asc" }, { sortOrder: "asc" }],
			select: { id: true, stage: true, label: true, description: true, status: true, isDefault: true, sortOrder: true },
		});
		return ServiceResponse.success("Checklist items retrieved.", items);
	},

	async checkEligibility(id: string, input: CheckEligibilityInput, user: AuthenticatedUser) {
		const patient = await prisma.patient.findUnique({ where: { id } });
		if (!patient) {
			return ServiceResponse.failure("Patient not found.", null, StatusCodes.NOT_FOUND);
		}

		const body = input ?? {};

		if (!canEditPatient(patient, user)) {
			return ServiceResponse.failure(
				"This patient is locked by the assigned VA. Only they or an admin can run eligibility checks.",
				null,
				StatusCodes.FORBIDDEN,
			);
		}

		// 1. Persist any payment info supplied during the check (e.g. from a VA
		//    reading the card / insurance details). Webhook intake data is also
		//    stored on the patient, so rules see everything.
		const paymentData: Record<string, unknown> = {};
		if (body.paymentMethod !== undefined) paymentData.paymentMethod = body.paymentMethod;
		if (body.insuranceProvider !== undefined) paymentData.insuranceProvider = body.insuranceProvider;
		if (body.paymentDetails !== undefined) paymentData.paymentDetails = body.paymentDetails;

		let latest = patient;
		if (Object.keys(paymentData).length > 0) {
			latest = await prisma.patient.update({
				where: { id },
				data: { ...paymentData, updatedAt: new Date(), updatedById: user.id },
			});
		}

		// 2. Build the profile used to evaluate the rules: stored payment fields +
		//    the simulated VOB snapshot.
		const vob = simulateVobSnapshot(patient, { insuranceProvider: latest.insuranceProvider });
		const storedDetails = (latest.paymentDetails ?? {}) as Record<string, unknown>;
		const profile: Record<string, unknown> = {
			paymentMethod: latest.paymentMethod ?? "",
			insuranceProvider: latest.insuranceProvider ?? "",
			paymentDetails: storedDetails,
			...vob,
		};

		// 3. Evaluate every active rule against the profile.
		const rules = await prisma.eligibilityRule.findMany({
			where: { isActive: true },
			orderBy: { createdAt: "asc" },
		});

		const failed: string[] = [];
		for (const rule of rules) {
			if (!evaluateRule(rule, profile)) {
				failed.push(rule.label);
			}
		}

		const isEligible = rules.length === 0 ? true : failed.length === 0;
		const status = isEligible ? "eligible" : "not_eligible";
		const reason = failed.length > 0 ? `Failed: ${failed.join("; ")}` : null;

		// 4. Persist the result.
		const updated = await prisma.patient.update({
			where: { id },
			data: {
				eligibilityStatus: status,
				eligibilityCheckedAt: new Date(),
				eligibilityDetails: { vob, evaluatedRules: rules.length },
				eligibilityReason: reason,
				updatedAt: new Date(),
				updatedById: user.id,
			},
			include: {
				assignedUser: { select: { id: true, name: true } },
				flaggedByUser: { select: { id: true, name: true } },
				flagClearedByUser: { select: { id: true, name: true } },
			},
		});

		await audit({
			patientId: id,
			user,
			action: "eligibility.check",
			entityType: "patient",
			entityId: id,
			prevValue: { eligibilityStatus: patient.eligibilityStatus },
			newValue: { eligibilityStatus: status, reason },
			message: `Eligibility check completed — ${status === "eligible" ? "Eligible" : "Not Eligible"}${reason ? ` (${reason})` : ""}`,
			type: "auto",
		});

		return ServiceResponse.success(
			status === "eligible" ? "Patient is eligible." : "Patient is not eligible.",
			updated,
		);
	},

	async intake(input: IntakeInput) {
		const appointmentDatetime = input.appointmentDatetime ? new Date(input.appointmentDatetime) : null;
		const firstStage = await getFirstStageKey();

		// Auto-assign VA: explicit selection wins, then vaName from webhook, then appointment time
		let assignedTo: string | null = null;
		let assignmentMethod = "none";

		// Get all VAs
		const vas = await prisma.user.findMany({
			where: { role: "va" },
			select: { id: true, name: true },
		});

		// 0. Explicit assignment (e.g. picked from a dropdown in the Add Patient form)
		if (input.assignedTo) {
			const explicitVa = vas.find((va) => va.id === input.assignedTo);
			if (explicitVa) {
				assignedTo = explicitVa.id;
				assignmentMethod = "explicit_selection";
			}
		}

		// 1. If vaName provided in webhook, try to find and assign to that VA
		if (!assignedTo && input.vaName && input.vaName.trim()) {
			const namedVa = vas.find((va) => va.name?.toLowerCase().includes(input.vaName!.toLowerCase()));
			if (namedVa) {
				assignedTo = namedVa.id;
				assignmentMethod = `webhook_va_name (${input.vaName})`;
			}
		}

		// 2. If not assigned yet and appointment time provided, use time-based assignment
		if (!assignedTo && appointmentDatetime) {
			const appointmentHour = appointmentDatetime.getHours();
			const jude = vas.find((va) => va.name?.toLowerCase().includes("jude"));
			const amanda = vas.find((va) => va.name?.toLowerCase().includes("amanda"));

			assignedTo = appointmentHour < 12 ? jude?.id ?? null : amanda?.id ?? null;
			if (assignedTo) {
				assignmentMethod = "appointment_time";
			}
		}

		const patient = await prisma.patient.create({
			data: {
				name: input.name,
				email: input.email ?? null,
				phone: input.phone ?? null,
				location: input.location ?? null,
				stage: firstStage,
				appointmentDatetime,
				bookingPlatform: input.bookingPlatform ?? null,
				problemDescription: input.problemDescription ?? null,
				paymentMethod: input.paymentMethod ?? null,
				insuranceProvider: input.insuranceProvider ?? null,
				paymentDetails: (input.paymentDetails as object) ?? null,
				visitStatus: input.visitStatus ?? undefined,
				source: "webhook",
				checklistState: {},
				notes: null,
				assignedTo,
			},
		});

		const platformLabel = input.bookingPlatform ?? "email";
		const assignmentNote = assignedTo
			? ` — Auto-assigned via ${assignmentMethod}`
			: "";
		await audit({
			patientId: patient.id,
			user: null,
			action: "patient.create",
			entityType: "patient",
			entityId: patient.id,
			newValue: { source: "webhook", platform: platformLabel, assignedTo, assignmentMethod },
			message: `New patient auto-created from booking email (${platformLabel})${assignmentNote}`,
			type: "auto",
		});

		try {
			const vas = await prisma.user.findMany({ where: { role: "va" }, select: { email: true } });
			const vaEmails = vas.map((v) => v.email).filter(Boolean) as string[];
			if (vaEmails.length > 0) {
				const appointmentStr = appointmentDatetime
					? appointmentDatetime.toLocaleDateString("en-US", {
							weekday: "short",
							month: "short",
							day: "numeric",
							year: "numeric",
							hour: "numeric",
							minute: "2-digit",
						})
					: undefined;
				await emailService.notifyNewPatient(patient.name, patient.id, vaEmails, {
					appointment: appointmentStr,
					platform: platformLabel,
				});
			}
		} catch (err) {
			logger.error({ err, patientId: patient.id }, "Failed to send new patient notification emails");
		}

		return ServiceResponse.success("Patient created from webhook intake.", patient, StatusCodes.CREATED);
	},

	async updateAppointment(id: string, input: UpdateAppointmentInput, user: AuthenticatedUser) {
		const patient = await prisma.patient.findUnique({
			where: { id },
			include: {
				assignedUser: { select: { id: true, name: true, email: true } },
			},
		});

		if (!patient) {
			return ServiceResponse.failure("Patient not found.", null, StatusCodes.NOT_FOUND);
		}

		if (!canEditPatient(patient, user)) {
			return ServiceResponse.failure(
				"This patient is locked by the assigned VA. Only they or an admin can update it.",
				null,
				StatusCodes.FORBIDDEN,
			);
		}

		const newDateTime = new Date(input.appointmentDatetime);
		const oldDateTime = patient.appointmentDatetime;

		// Auto-assign VA based on appointment time if patient not already assigned
		let newAssignedTo = patient.assignedTo;
		if (!patient.assignedTo && newDateTime) {
			const appointmentHour = newDateTime.getHours();
			const vas = await prisma.user.findMany({
				where: { role: "va" },
				select: { id: true, name: true },
			});

			// Find Jude (morning shifts, < 12pm) and Amanda (evening shifts, >= 12pm)
			const jude = vas.find((va) => va.name?.toLowerCase().includes("jude"));
			const amanda = vas.find((va) => va.name?.toLowerCase().includes("amanda"));

			newAssignedTo = appointmentHour < 12 ? jude?.id ?? null : amanda?.id ?? null;
		}

		const updated = await prisma.patient.update({
			where: { id },
			data: {
				appointmentDatetime: newDateTime,
				assignedTo: newAssignedTo,
				updatedAt: new Date(),
				updatedById: user.id,
			},
			include: {
				assignedUser: { select: { id: true, name: true, email: true } },
			},
		});

		const autoAssignmentNote = newAssignedTo && !patient.assignedTo
			? ` — Auto-assigned based on appointment time`
			: "";
		await audit({
			patientId: id,
			user,
			action: "appointment.update",
			entityType: "patient",
			entityId: id,
			prevValue: { appointmentDatetime: oldDateTime, assignedTo: patient.assignedTo },
			newValue: { appointmentDatetime: newDateTime, assignedTo: newAssignedTo },
			message: `Appointment rescheduled to ${newDateTime.toLocaleDateString("en-US")} at ${newDateTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}${autoAssignmentNote}`,
		});

		// Send notification emails
		try {
			const admin = await prisma.user.findFirst({ where: { role: "admin" }, select: { email: true } });
			if (admin?.email && patient.email) {
				await emailService.notifyAppointmentChanged(
					patient.name,
					patient.email,
					newDateTime,
					user.name,
					admin.email,
				);
			}
		} catch (err) {
			logger.error({ err, patientId: id }, "Failed to send appointment change notification emails");
			// Don't fail the update if email fails - still return success
		}

		return ServiceResponse.success("Appointment updated and notifications sent.", updated);
	},
};
