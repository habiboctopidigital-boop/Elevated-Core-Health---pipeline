import { Router } from "express";

import { requireAuth } from "@/middlewares/auth";
import { validateRequest } from "@/utils/httpHandlers";
import { importController } from "./import.controller";
import { upload } from "./import.middleware";
import { ApplyImportSchema } from "./import.validation";

export const importRouter: Router = Router();

importRouter.use(requireAuth);

importRouter.post(
	"/",
	(req, res, next) => {
		upload.single("file")(req, res, (err) => {
			if (err) {
				const message = err instanceof Error ? err.message : "File upload failed.";
				res.status(400).json({
					success: false,
					message,
					data: null,
					statusCode: 400,
				});
				return;
			}
			next();
		});
	},
	importController.uploadFile,
);

importRouter.post("/apply", validateRequest(ApplyImportSchema), importController.applyImport);
importRouter.get("/history", importController.listBatches);
