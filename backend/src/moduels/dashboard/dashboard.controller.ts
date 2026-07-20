import type { Request, Response } from "express";

import { handleServiceResponse } from "@/utils/httpHandlers";
import { dashboardService } from "./dashboard.service";

export const dashboardController = {
	async getSummary(_req: Request, res: Response): Promise<void> {
		const serviceResponse = await dashboardService.getSummary();
		handleServiceResponse(serviceResponse, res);
	},
};
