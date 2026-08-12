import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

import { handleServiceResponse } from "@/utils/httpHandlers";
import { ServiceResponse } from "@/utils/serviceResponse";
import { activityLogService } from "./activity-log.service";

export const activityLogController = {
	async list(req: Request, res: Response): Promise<void> {
		if (!req.user) {
			handleServiceResponse(ServiceResponse.failure("Unauthorized.", null, StatusCodes.UNAUTHORIZED), res);
			return;
		}
		const serviceResponse = await activityLogService.list(req.query as never, req.user);
		handleServiceResponse(serviceResponse, res);
	},
};
