import type { Request, Response } from "express";

import { handleServiceResponse } from "@/utils/httpHandlers";
import { activityLogService } from "./activity-log.service";

export const activityLogController = {
	async list(req: Request, res: Response): Promise<void> {
		const serviceResponse = await activityLogService.list(req.query as never);
		handleServiceResponse(serviceResponse, res);
	},
};
