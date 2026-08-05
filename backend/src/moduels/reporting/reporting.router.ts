import { Router } from "express";

import { requireAuth, requireRole } from "@/middlewares/auth";
import { reportingController } from "./reporting.controller";

export const reportingRouter: Router = Router();

reportingRouter.use(requireAuth);

// Platform-wide report (admin only)
reportingRouter.get("/admin", requireRole("admin"), reportingController.getAdminReport);

// Individual VA performance report (admin drill-down)
reportingRouter.get("/va/:id", requireRole("admin"), reportingController.getVaReport);

// Current user's own report (VAs see only themselves)
reportingRouter.get("/me", reportingController.getMyReport);
