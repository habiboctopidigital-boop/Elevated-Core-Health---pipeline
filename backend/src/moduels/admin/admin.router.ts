import { Router } from "express";

import { requireAuth, requireRole } from "@/middlewares/auth";
import { validateRequest } from "@/utils/httpHandlers";
import { adminController } from "./admin.controller";
import {
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

export const adminRouter: Router = Router();

adminRouter.use(requireAuth, requireRole("admin"));

// User management
adminRouter.get("/users", adminController.listUsers);
adminRouter.post("/users", validateRequest(CreateUserSchema), adminController.createUser);
adminRouter.patch("/users/:id", validateRequest(UpdateUserSchema), adminController.updateUser);
adminRouter.delete("/users/:id", adminController.deleteUser);

// Stage management (reorder must be registered before /:key routes)
adminRouter.get("/stages", adminController.listStages);
adminRouter.post("/stages", validateRequest(StageCreateSchema), adminController.createStage);
adminRouter.patch("/stages/reorder", validateRequest(StageReorderSchema), adminController.reorderStages);
adminRouter.patch("/stages/:key", validateRequest(StageUpdateSchema), adminController.updateStage);
adminRouter.delete("/stages/:key", adminController.deleteStage);

// Checklist management
adminRouter.get("/checklist-items", adminController.listChecklistItems);
adminRouter.post("/checklist-items", validateRequest(ChecklistItemSchema), adminController.createChecklistItem);
adminRouter.patch(
	"/checklist-items/:id",
	validateRequest(UpdateChecklistItemSchema),
	adminController.updateChecklistItem,
);
adminRouter.delete("/checklist-items/:id", adminController.deleteChecklistItem);

// Eligibility rules
adminRouter.get("/eligibility-rules", adminController.listEligibilityRules);
adminRouter.post(
	"/eligibility-rules",
	validateRequest(CreateEligibilityRuleSchema),
	adminController.createEligibilityRule,
);
adminRouter.patch(
	"/eligibility-rules/:id",
	validateRequest(UpdateEligibilityRuleSchema),
	adminController.updateEligibilityRule,
);
adminRouter.delete("/eligibility-rules/:id", adminController.deleteEligibilityRule);

// Analytics
adminRouter.get("/analytics", adminController.getAnalytics);

// CRM Connect settings
adminRouter.get("/crm-integration", adminController.getCrmIntegration);
adminRouter.post("/crm-integration/connect", validateRequest(CrmConnectSchema), adminController.connectCrm);
adminRouter.post("/crm-integration/disconnect", adminController.disconnectCrm);
adminRouter.patch(
	"/crm-integration/permission",
	validateRequest(CrmUpdatePermissionSchema),
	adminController.updateCrmPermission,
);
