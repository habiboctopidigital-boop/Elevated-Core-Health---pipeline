import { Router } from "express";

import { requireAuth } from "@/middlewares/auth";
import { validateRequest } from "@/utils/httpHandlers";
import { activityLogController } from "./activity-log.controller";
import { ActivityLogQuerySchema } from "./activity-log.validation";

export const activityLogRouter: Router = Router();

activityLogRouter.use(requireAuth);

activityLogRouter.get("/", validateRequest(ActivityLogQuerySchema), activityLogController.list);
