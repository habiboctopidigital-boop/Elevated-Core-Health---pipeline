import type { Request, Response } from "express";

import { getRequestContext } from "@/lib/audit";
import { handleServiceResponse } from "@/utils/httpHandlers";
import { ServiceResponse } from "@/utils/serviceResponse";
import { webhooksService } from "./webhooks.service";

export const webhooksController = {
	async getSettings(req: Request, res: Response): Promise<void> {
		const publicUrl = `${req.protocol}://${req.get("host")}/api/patients/intake`;
		const serviceResponse = await webhooksService.getWebhookSettings(publicUrl);
		handleServiceResponse(serviceResponse, res);
	},

	async rotateSecret(req: Request, res: Response): Promise<void> {
		if (!req.user) {
			handleServiceResponse(ServiceResponse.failure("Not authenticated", null, 401), res);
			return;
		}
		const serviceResponse = await webhooksService.rotateSecret(req.user, getRequestContext(req));
		handleServiceResponse(serviceResponse, res);
	},

	async testWebhook(req: Request, res: Response): Promise<void> {
		if (!req.user) {
			handleServiceResponse(ServiceResponse.failure("Not authenticated", null, 401), res);
			return;
		}
		const serviceResponse = await webhooksService.sendTestWebhook(req.body, req.user, getRequestContext(req));
		handleServiceResponse(serviceResponse, res);
	},
};
