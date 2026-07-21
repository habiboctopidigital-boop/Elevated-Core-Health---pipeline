import type { Request, Response } from "express";

import { handleServiceResponse } from "@/utils/httpHandlers";
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
};
