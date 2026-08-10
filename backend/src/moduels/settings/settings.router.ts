import { Router } from "express";
import { requireAuth, requireRole } from "@/middlewares/auth";
import { validateRequest } from "@/utils/httpHandlers";
import { settingsController } from "./settings.controller";
import { UpdateSettingSchema } from "./settings.validation";

export const settingsRouter = Router();

// All settings routes require admin auth
settingsRouter.use(requireAuth);
settingsRouter.use(requireRole("admin"));

// GET /admin/settings/:key
settingsRouter.get("/:key", settingsController.getSetting);

// PATCH /admin/settings/:key
settingsRouter.patch(
  "/:key",
  validateRequest(UpdateSettingSchema),
  settingsController.updateSetting
);
