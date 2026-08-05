import { Router } from "express";

import { requireAuth, requireRole } from "@/middlewares/auth";
import { validateRequest } from "@/utils/httpHandlers";
import { crmController } from "./crm.controller";
import { CrmQuerySchema } from "./crm.validation";

export const crmRouter: Router = Router();

// CRM contact data (incl. export) is admin-only — VAs use the pipeline/import views.
crmRouter.use(requireAuth, requireRole("admin"));

crmRouter.get("/contacts", validateRequest(CrmQuerySchema), crmController.listContacts);
crmRouter.get("/contacts/export", validateRequest(CrmQuerySchema), crmController.exportContacts);
