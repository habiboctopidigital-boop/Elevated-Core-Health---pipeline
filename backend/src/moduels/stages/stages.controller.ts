import type { Request, Response } from "express";

import { handleServiceResponse } from "@/utils/httpHandlers";
import { stagesService } from "./stages.service";

export const stagesController = {
	async list(_req: Request, res: Response): Promise<void> {
		const serviceResponse = await stagesService.list();
		handleServiceResponse(serviceResponse, res);
	},
};
