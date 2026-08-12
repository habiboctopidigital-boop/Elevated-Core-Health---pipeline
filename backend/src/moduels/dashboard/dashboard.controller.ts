import type { Request, Response } from "express";

import { handleServiceResponse } from "@/utils/httpHandlers";
import { ServiceResponse } from "@/utils/serviceResponse";
import { dashboardService } from "./dashboard.service";

export const dashboardController = {
	async getSummary(req: Request, res: Response): Promise<void> {
		if (!req.user) {
			handleServiceResponse(ServiceResponse.failure("Not authenticated", null, 401), res);
			return;
		}
		const serviceResponse = await dashboardService.getSummary(req.user);
		handleServiceResponse(serviceResponse, res);
	},
};
