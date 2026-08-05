import type { Request, Response } from "express";

import { handleServiceResponse } from "@/utils/httpHandlers";
import { ServiceResponse } from "@/utils/serviceResponse";
import { importService } from "./import.service";

export const importController = {
	async uploadFile(req: Request, res: Response): Promise<void> {
		const file = req.file
			? {
					originalname: req.file.originalname,
					mimetype: req.file.mimetype,
					size: req.file.size,
					buffer: req.file.buffer,
				}
			: undefined;
		const serviceResponse = await importService.processImport(file);
		handleServiceResponse(serviceResponse, res);
	},

	async applyImport(req: Request, res: Response): Promise<void> {
		if (!req.user) {
			handleServiceResponse(ServiceResponse.failure("Not authenticated", null, 401), res);
			return;
		}
		const serviceResponse = await importService.applyImport(req.body, req.user);
		handleServiceResponse(serviceResponse, res);
	},

	async listBatches(_req: Request, res: Response): Promise<void> {
		const serviceResponse = await importService.listBatches();
		handleServiceResponse(serviceResponse, res);
	},
};
