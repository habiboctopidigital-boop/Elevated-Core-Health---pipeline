import { Router } from "express";

import { activityLogRouter } from "./activity-log/activity-log.router";
import { adminRouter } from "./admin/admin.router";
import { authRouter } from "./auth/auth.router";
import { dashboardRouter } from "./dashboard/dashboard.router";
import { importRouter } from "./import/import.router";
import { patientsPublicRouter, patientsRouter } from "./patients/patients.router";
import { usersRouter } from "./users/users.router";

export const apiRouter: Router = Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/patients", patientsPublicRouter);
apiRouter.use("/patients", patientsRouter);
apiRouter.use("/patients/import", importRouter);
apiRouter.use("/activity-log", activityLogRouter);
apiRouter.use("/dashboard", dashboardRouter);
apiRouter.use("/admin", adminRouter);
apiRouter.use("/users", usersRouter);
