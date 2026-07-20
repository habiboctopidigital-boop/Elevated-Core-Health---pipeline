import { Router } from "express";

import { requireAuth } from "@/middlewares/auth";
import { activityLogController } from "./activity-log.controller";

export const activityLogRouter: Router = Router();

activityLogRouter.use(requireAuth);

activityLogRouter.get("/", activityLogController.list);
