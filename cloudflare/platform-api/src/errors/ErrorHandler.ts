import { ErrorCodes, type ErrorCode } from './ErrorCodes.js';

export interface PlatformError {
	code: ErrorCode;
	message: string;
	statusCode: number;
	details?: Record<string, unknown>;
}

export class ErrorHandler {
	private static mapError(
		code: ErrorCode,
		message: string,
		statusCode: number,
		details?: Record<string, unknown>
	): PlatformError {
		return {
			code,
			message,
			statusCode,
			details
		};
	}

	static validation(message: string, details?: Record<string, unknown>) {
		return this.mapError(ErrorCodes.VALIDATION_ERROR, message, 400, details);
	}

	static notFound(message: string, details?: Record<string, unknown>) {
		return this.mapError(ErrorCodes.NOT_FOUND, message, 404, details);
	}

	static auth(message: string, details?: Record<string, unknown>) {
		return this.mapError(ErrorCodes.AUTH_ERROR, message, 401, details);
	}

	static tenant(message: string, details?: Record<string, unknown>) {
		return this.mapError(ErrorCodes.TENANT_ERROR, message, 403, details);
	}

	static conflict(message: string, details?: Record<string, unknown>) {
		return this.mapError(ErrorCodes.CONFLICT, message, 409, details);
	}

	static internal(message: string, details?: Record<string, unknown>) {
		return this.mapError(ErrorCodes.INTERNAL_ERROR, message, 500, details);
	}
}