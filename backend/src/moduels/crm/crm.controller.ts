import type { Request, Response } from "express";

import { getRequestContext } from "@/lib/audit";
import { handleServiceResponse } from "@/utils/httpHandlers";
import { ServiceResponse } from "@/utils/serviceResponse";
import { crmService } from "./crm.service";

export const crmController = {
	async listContacts(req: Request, res: Response): Promise<void> {
		const serviceResponse = await crmService.listContacts(req.query as Record<string, unknown>);
		handleServiceResponse(serviceResponse, res);
	},

	async exportContacts(req: Request, res: Response): Promise<void> {
		if (!req.user) {
			handleServiceResponse(ServiceResponse.failure("Not authenticated", null, 401), res);
			return;
		}
		const serviceResponse = await crmService.exportContacts(
			req.query as Record<string, unknown>,
			req.user,
			getRequestContext(req),
		);
		handleServiceResponse(serviceResponse, res);
	},
};
