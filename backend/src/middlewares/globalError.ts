import type { ErrorRequestHandler } from "express";
import { StatusCodes } from "http-status-codes";

import { AppError } from "@/utils/appError";
import { handleServiceResponse } from "@/utils/httpHandlers";
import { logger } from "@/utils/logger";
import { ServiceResponse } from "@/utils/serviceResponse";

export const globalErrorHandler: ErrorRequestHandler = (err, req, res, _next) => {
	if (res.headersSent) return;

	if (err instanceof AppError) {
		handleServiceResponse(ServiceResponse.failure(err.message, err.data, err.statusCode), res);
		return;
	}

	logger.error({ err }, `Unhandled error in ${req.method} ${req.originalUrl}`);
	handleServiceResponse(
		ServiceResponse.failure("Something went wrong. Please try again.", null, StatusCodes.INTERNAL_SERVER_ERROR),
		res,
	);
};
