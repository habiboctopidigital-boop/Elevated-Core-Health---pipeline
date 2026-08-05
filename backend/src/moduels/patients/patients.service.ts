import { StatusCodes } from "http-status-codes";

import { isChecklistComplete } from "@/config/checklists";
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
} from "./patients.validation";

const STAGE_ORDER = [
	"onboarding",
	"visit_complete",
	"post_visit_docs",
	"chart_signed",
	"sent_to_billing",
	"payment_posted",
	"reconciled",
] as const;

type Stage = (typeof STAGE_ORDER)[number];

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

async function logActivity(patientId: string, author: string, message: string, type: "auto" | "manual") {
	try {
		await prisma.activityLog.create({ data: { patientId, author, message, type } });
	} catch (err) {
		logger.error({ err }, "Failed to log activity");
	}
}

export const patientsService = {
	async list(stage?: string) {
		const where = stage ? { stage: stage as Stage } : {};
		const patients = await prisma.patient.findMany({
			where,
			orderBy: { updatedAt: "desc" },
			include: {
				assignedUser: { select: { id: true, name: true } },
				flaggedByUser: { select: { id: true, name: true } },
				flagClearedByUser: { select: { id: true, name: true } },
			},
		});
		return ServiceResponse.success("Patients retrieved.", patients);
	},

	async getById(id: string) {
		const patient = await prisma.patient.findUnique({
			where: { id },
			include: {
				assignedUser: { select: { id: true, name: true } },
				flaggedByUser: { select: { id: true, name: true } },
				flagClearedByUser: { select: { id: true, name: true } },
				activityLogs: { orderBy: { createdAt: "desc" }, take: 50 },
			},
		});
		if (!patient) {
			return ServiceResponse.failure("Patient not found.", null, StatusCodes.NOT_FOUND);
		}
		return ServiceResponse.success("Patient retrieved.", patient);
	},

	async moveStage(id: string, input: StageMoveInput, user: AuthenticatedUser) {
		if (user.role === "admin") {
			return ServiceResponse.failure(
				"Admin cannot move stages. Assign a VA to move the patient.",
				null,
				StatusCodes.FORBIDDEN,
			);
		}

		const patient = await prisma.patient.findUnique({ where: { id } });
		if (!patient) {
			return ServiceResponse.failure("Patient not found.", null, StatusCodes.NOT_FOUND);
		}

		const curIdx = STAGE_ORDER.indexOf(patient.stage as Stage);
		const tgtIdx = STAGE_ORDER.indexOf(input.targetStage as Stage);

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

		const updated = await prisma.patient.update({
			where: { id },
			data: { stage: input.targetStage as Stage, updatedAt: new Date(), updatedById: user.id },
		});

		await logActivity(id, user.name, `Moved from ${patient.stage} to ${input.targetStage}`, "auto");

		return ServiceResponse.success("Stage updated.", updated);
	},

	async assign(id: string, input: AssignInput, user: AuthenticatedUser) {
		const patient = await prisma.patient.findUnique({ where: { id } });
		if (!patient) {
			return ServiceResponse.failure("Patient not found.", null, StatusCodes.NOT_FOUND);
		}

		const updated = await prisma.patient.update({
			where: { id },
			data: { assignedTo: input.assignedTo, updatedAt: new Date(), updatedById: user.id },
		});

		await logActivity(id, user.name, `Assigned patient`, "manual");

		return ServiceResponse.success("Assignment updated.", updated);
	},

	async toggleChecklist(id: string, input: ChecklistToggleInput, user: AuthenticatedUser) {
		const patient = await prisma.patient.findUnique({ where: { id } });
		if (!patient) {
			return ServiceResponse.failure("Patient not found.", null, StatusCodes.NOT_FOUND);
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
		await logActivity(id, user.name, `Checklist item "${label}" ${action}`, "auto");

		return ServiceResponse.success("Checklist updated.", updated);
	},

	async updateNotes(id: string, input: NotesInput, user: AuthenticatedUser) {
		const patient = await prisma.patient.findUnique({ where: { id } });
		if (!patient) {
			return ServiceResponse.failure("Patient not found.", null, StatusCodes.NOT_FOUND);
		}

		const updated = await prisma.patient.update({
			where: { id },
			data: { notes: input.notes, updatedAt: new Date(), updatedById: user.id },
		});

		await logActivity(
			id,
			user.name,
			`Note updated: "${input.notes.slice(0, 60)}${input.notes.length > 60 ? "..." : ""}"`,
			"manual",
		);

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

		await logActivity(id, user.name, `Flagged for Donna: ${input.reason}`, "manual");

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

		await logActivity(id, user.name, `Flag cleared — ${input.clearReason}`, "manual");

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

		await logActivity(id, user.name, `Claimed responsibility for patient`, "manual");

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
			orderBy: [{ stage: "asc" as never }, { sortOrder: "asc" }],
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

		await logActivity(
			id,
			user.name,
			`Eligibility check completed — ${status === "eligible" ? "Eligible" : "Not Eligible"}${reason ? ` (${reason})` : ""}`,
			"auto",
		);

		return ServiceResponse.success(
			status === "eligible" ? "Patient is eligible." : "Patient is not eligible.",
			updated,
		);
	},

	async intake(input: IntakeInput) {
		const appointmentDatetime = input.appointmentDatetime ? new Date(input.appointmentDatetime) : null;

		const patient = await prisma.patient.create({
			data: {
				name: input.name,
				email: input.email ?? null,
				phone: input.phone ?? null,
				stage: "onboarding",
				appointmentDatetime,
				bookingPlatform: input.bookingPlatform ?? null,
				problemDescription: input.problemDescription ?? null,
				paymentMethod: input.paymentMethod ?? null,
				insuranceProvider: input.insuranceProvider ?? null,
				paymentDetails: (input.paymentDetails as object) ?? null,
				source: "webhook",
				checklistState: {},
				notes: null,
			},
		});

		const platformLabel = input.bookingPlatform ?? "email";
		await logActivity(patient.id, "system", `New patient auto-created from booking email (${platformLabel})`, "auto");

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
};
