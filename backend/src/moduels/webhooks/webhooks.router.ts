import { Router } from "express";

import { requireAuth, requireRole } from "@/middlewares/auth";
import { validateRequest } from "@/utils/httpHandlers";
import { webhooksController } from "./webhooks.controller";
import { TestWebhookSchema } from "./webhooks.validation";

export const webhooksRouter: Router = Router();

// Admin-only — same gate as the rest of /admin/*.
webhooksRouter.use(requireAuth, requireRole("admin"));

webhooksRouter.get("/settings", webhooksController.getSettings);
webhooksRouter.post("/rotate-secret", webhooksController.rotateSecret);
webhooksRouter.post("/test", validateRequest(TestWebhookSchema), webhooksController.testWebhook);
