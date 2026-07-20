import { Router } from "express";

import { requireAuth } from "@/middlewares/auth";
import { validateRequest } from "@/utils/httpHandlers";
import { authController } from "./auth.controller";
import { LoginSchema, RefreshSchema } from "./auth.validation";

export const authRouter: Router = Router();

authRouter.post("/login", validateRequest(LoginSchema), authController.login);
authRouter.post("/refresh", validateRequest(RefreshSchema), authController.refresh);
authRouter.get("/me", requireAuth, authController.me);
authRouter.post("/logout", authController.logout);
