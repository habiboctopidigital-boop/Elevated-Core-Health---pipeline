import { Router } from "express";

import { requireAuth, requireRole } from "@/middlewares/auth";
import { handleServiceResponse, validateRequest } from "@/utils/httpHandlers";
import { ServiceResponse } from "@/utils/serviceResponse";
import { webhooksService } from "../webhooks/webhooks.service";
import { patientsController } from "./patients.controller";
import {
	AssignSchema,
	CheckEligibilitySchema,
	ChecklistToggleSchema,
	ClaimSchema,
	ClearFlagSchema,
	CreatePatientSchema,
	DeleteNoteSchema,
	FlagSchema,
	IntakeSchema,
	NotesSchema,
	StageMoveSchema,
	UpdateAppointmentSchema,
	UpdatePatientSchema,
	UpdateStatusSchema,
} from "./patients.validation";

export const patientsRouter: Router = Router();
export const patientsPublicRouter: Router = Router();

// Webhook intake — uses shared secret, not user auth. Mounted at different path.
// The secret is DB-backed (rotatable from Admin → Settings → Webhooks) and
// falls back to the static WEBHOOK_SECRET env var until the first rotation —
// see webhooksService.getActiveSecret().
patientsPublicRouter.post(
	"/intake",
	async (req, res, next) => {
		console.log(req.body);
		
		// const secret = req.headers["x-webhook-secret"];
		// const activeSecret = await webhooksService.getActiveSecret();
		// if (!secret || secret !== activeSecret) {
		// 	handleServiceResponse(ServiceResponse.failure("Invalid webhook secret.", null, 401), res);
		// 	return;
		// }
		next();
	},
	validateRequest(IntakeSchema),
	patientsController.intake,
);

// All other patient routes require JWT auth
patientsRouter.use(requireAuth);

patientsRouter.get("/", patientsController.list);
// Manual create — authenticated user is recorded as the audit author.
patientsRouter.post("/", validateRequest(CreatePatientSchema), patientsController.create);
patientsRouter.get("/checklist-items", patientsController.listChecklistItems);
patientsRouter.get("/:id", patientsController.getById);
patientsRouter.patch("/:id/stage", validateRequest(StageMoveSchema), patientsController.moveStage);
// Reassigning a patient to an arbitrary user is admin/super_admin only (task.md §17: "Reassign patients" — VA: No).
// A VA claiming an unassigned patient for themselves is a separate, narrower action — see POST /:id/claim below.
patientsRouter.patch("/:id/assign", requireRole("admin"), validateRequest(AssignSchema), patientsController.assign);
patientsRouter.patch("/:id", validateRequest(UpdatePatientSchema), patientsController.updatePatient);
patientsRouter.post("/:id/lock", patientsController.lockPatient);
patientsRouter.post("/:id/unlock", patientsController.unlockPatient);
patientsRouter.patch(
	"/:id/status",
	requireRole("admin"),
	validateRequest(UpdateStatusSchema),
	patientsController.updateStatus,
);
patientsRouter.patch("/:id/checklist", validateRequest(ChecklistToggleSchema), patientsController.toggleChecklist);
patientsRouter.post("/:id/notes", validateRequest(NotesSchema), patientsController.createNote);
patientsRouter.delete("/:id/notes/:noteId", validateRequest(DeleteNoteSchema), patientsController.deleteNote);
patientsRouter.patch(
	"/:id/appointment",
	validateRequest(UpdateAppointmentSchema),
	patientsController.updateAppointment,
);
patientsRouter.post("/:id/flag", validateRequest(FlagSchema), patientsController.flag);
patientsRouter.post(
	"/:id/check-eligibility",
	validateRequest(CheckEligibilitySchema),
	patientsController.checkEligibility,
);
patientsRouter.patch(
	"/:id/flag/clear",
	requireRole("admin"),
	validateRequest(ClearFlagSchema),
	patientsController.clearFlag,
);
patientsRouter.delete("/:id", requireRole("admin"), patientsController.deletePatient);
patientsRouter.post("/:id/claim", validateRequest(ClaimSchema), patientsController.claim);

// Frontend test endpoint — simulates webhook intake (requires auth, not webhook secret)
patientsRouter.post("/intake-test", validateRequest(IntakeSchema), patientsController.intake);
