import { Router } from "express";

import { requireAuth } from "@/middlewares/auth";
import { stagesController } from "./stages.controller";

export const stagesRouter: Router = Router();

stagesRouter.use(requireAuth);

stagesRouter.get("/", stagesController.list);
