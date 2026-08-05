import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

import { handleServiceResponse } from "@/utils/httpHandlers";
import { ServiceResponse } from "@/utils/serviceResponse";
import { reportingService } from "./reporting.service";

function paramId(req: Request): string {
	const id = req.params.id;
	return Array.isArray(id) ? id[0] : id;
}

export const reportingController = {
	async getAdminReport(_req: Request, res: Response): Promise<void> {
		const serviceResponse = await reportingService.getAdminReport();
		handleServiceResponse(serviceResponse, res);
	},

	async getMyReport(req: Request, res: Response): Promise<void> {
		if (!req.user) {
			handleServiceResponse(ServiceResponse.failure("Unauthorized.", null, StatusCodes.UNAUTHORIZED), res);
			return;
		}
		const serviceResponse = await reportingService.getVaReport(req.user.id);
		handleServiceResponse(serviceResponse, res);
	},

	async getVaReport(req: Request, res: Response): Promise<void> {
		const serviceResponse = await reportingService.getVaReport(paramId(req));
		handleServiceResponse(serviceResponse, res);
	},
};
