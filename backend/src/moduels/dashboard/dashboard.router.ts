import { Router } from "express";

import { requireAuth } from "@/middlewares/auth";
import { dashboardController } from "./dashboard.controller";

export const dashboardRouter: Router = Router();

dashboardRouter.use(requireAuth);

dashboardRouter.get("/summary", dashboardController.getSummary);
