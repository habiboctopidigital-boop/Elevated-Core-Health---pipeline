import type { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import type { ZodSchema } from "zod";

import { AppError } from "@/utils/appError";
import { logger } from "@/utils/logger";
import { ServiceResponse } from "@/utils/serviceResponse";

/** Writes a ServiceResponse to the Express response with its status code. */
export const handleServiceResponse = (serviceResponse: ServiceResponse<unknown>, res: Response): void => {
	res.status(serviceResponse.statusCode).json(serviceResponse);
};

/**
 * Wraps an async controller so every route shares the same error contract:
 *   - the handler returns a `ServiceResponse` → it is sent as-is;
 *   - the handler throws an `AppError` → mapped to a failure response (403/404/…);
 *   - anything else → logged and returned as a generic 500 (no detail leaks).
 * This keeps individual controllers thin and free of repetitive try/catch.
 */
export const asyncHandler =
	(handler: (req: Request, res: Response) => Promise<ServiceResponse<unknown> | undefined>) =>
	async (req: Request, res: Response): Promise<void> => {
		try {
			const result = await handler(req, res);
			if (result) handleServiceResponse(result, res);
		} catch (err) {
			if (err instanceof AppError) {
				handleServiceResponse(ServiceResponse.failure(err.message, err.data, err.statusCode), res);
				return;
			}
			logger.error({ err }, `Unhandled error in ${req.method} ${req.originalUrl}`);
			handleServiceResponse(
				ServiceResponse.failure("Something went wrong. Please try again.", null, StatusCodes.INTERNAL_SERVER_ERROR),
				res,
			);
		}
	};

/** Drops the `body` / `query` / `params` container key from a Zod error path. */
const formatPath = (path: (string | number)[]): string => {
	const [, ...rest] = path;
	const field = rest.length > 0 ? rest.join(".") : path.join(".");
	return field || "root";
};

/**
 * Validates `{ body, query, params }` against a Zod schema before the handler
 * runs. On failure it short-circuits with a 400 ServiceResponse — invalid data
 * never reaches the controller.
 */
export const validateRequest =
	(schema: ZodSchema) =>
	(req: Request, res: Response, next: NextFunction): void => {
		const result = schema.safeParse({ body: req.body, query: req.query, params: req.params });

		if (result.success) {
			// Propagate parsed/normalized values (e.g. trimmed + lowercased email)
			// downstream. In Express 5 `query`/`params` are read-only getters, so only
			// `body` is reassigned.
			const parsed = result.data as { body?: unknown };
			if (parsed && typeof parsed === "object" && "body" in parsed) {
				req.body = parsed.body;
			}
			next();
			return;
		}

		const errors = result.error.issues.map((issue) => `${formatPath(issue.path)}: ${issue.message}`);
		const message =
			errors.length === 1
				? `Invalid input: ${errors[0]}`
				: `Invalid input (${errors.length} errors): ${errors.join("; ")}`;

		handleServiceResponse(ServiceResponse.failure(message, null, StatusCodes.BAD_REQUEST), res);
	};
