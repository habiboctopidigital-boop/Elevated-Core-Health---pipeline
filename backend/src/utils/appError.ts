import { StatusCodes } from "http-status-codes";

/**
 * An expected, client-safe error thrown from the service layer. The
 * `asyncHandler` wrapper (see `httpHandlers.ts`) catches it and turns it into a
 * failure `ServiceResponse` with the right HTTP status — so services can throw
 * `AppError.notFound(...)` instead of hand-building responses everywhere.
 *
 * Anything that is NOT an `AppError` is treated as an unexpected bug: logged and
 * returned as a generic 500 so internal details never leak to the client.
 */
export class AppError extends Error {
	readonly statusCode: number;
	readonly data: unknown;

	constructor(statusCode: number, message: string, data: unknown = null) {
		super(message);
		this.name = "AppError";
		this.statusCode = statusCode;
		this.data = data;
	}

	static badRequest(message = "Bad request", data: unknown = null): AppError {
		return new AppError(StatusCodes.BAD_REQUEST, message, data);
	}

	static unauthorized(message = "Authentication required"): AppError {
		return new AppError(StatusCodes.UNAUTHORIZED, message);
	}

	static forbidden(message = "You do not have access to this resource"): AppError {
		return new AppError(StatusCodes.FORBIDDEN, message);
	}

	static notFound(message = "Resource not found"): AppError {
		return new AppError(StatusCodes.NOT_FOUND, message);
	}

	static conflict(message = "The resource is in a conflicting state"): AppError {
		return new AppError(StatusCodes.CONFLICT, message);
	}

	static unsupportedMediaType(message = "Unsupported file type"): AppError {
		return new AppError(StatusCodes.UNSUPPORTED_MEDIA_TYPE, message);
	}

	static payloadTooLarge(message = "File exceeds the maximum allowed size"): AppError {
		return new AppError(StatusCodes.REQUEST_TOO_LONG, message);
	}
}
