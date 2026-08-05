import type { Request, Response } from "express";

import { handleServiceResponse } from "@/utils/httpHandlers";
import { crmService } from "./crm.service";

export const crmController = {
	async listContacts(req: Request, res: Response): Promise<void> {
		const serviceResponse = await crmService.listContacts(req.query as Record<string, unknown>);
		handleServiceResponse(serviceResponse, res);
	},

	async exportContacts(req: Request, res: Response): Promise<void> {
		const serviceResponse = await crmService.exportContacts(req.query as Record<string, unknown>);
		handleServiceResponse(serviceResponse, res);
	},
};
