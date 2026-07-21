import { Router } from "express";

import { requireAuth, requireRole } from "@/middlewares/auth";
import { validateRequest } from "@/utils/httpHandlers";
import { adminController } from "./admin.controller";
import { ChecklistItemSchema, CreateUserSchema, UpdateChecklistItemSchema, UpdateUserSchema } from "./admin.validation";

export const adminRouter: Router = Router();

adminRouter.use(requireAuth, requireRole("admin"));

// User management
adminRouter.get("/users", adminController.listUsers);
adminRouter.post("/users", validateRequest(CreateUserSchema), adminController.createUser);
adminRouter.patch("/users/:id", validateRequest(UpdateUserSchema), adminController.updateUser);
adminRouter.delete("/users/:id", adminController.deleteUser);

// Checklist management
adminRouter.get("/checklist-items", adminController.listChecklistItems);
adminRouter.post("/checklist-items", validateRequest(ChecklistItemSchema), adminController.createChecklistItem);
adminRouter.patch(
	"/checklist-items/:id",
	validateRequest(UpdateChecklistItemSchema),
	adminController.updateChecklistItem,
);
adminRouter.delete("/checklist-items/:id", adminController.deleteChecklistItem);

// Analytics
adminRouter.get("/analytics", adminController.getAnalytics);
