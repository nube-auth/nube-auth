/**
 * Standard error response format for all API endpoints
 * Provides consistent error handling across the platform
 */

export type ErrorCode =
	| "VALIDATION_ERROR"
	| "UNAUTHORIZED"
	| "FORBIDDEN"
	| "NOT_FOUND"
	| "CONFLICT"
	| "RATE_LIMIT_EXCEEDED"
	| "ACCOUNT_LOCKED"
	| "INVALID_CREDENTIALS"
	| "EXPIRED_TOKEN"
	| "INTERNAL_ERROR"
	| "BAD_REQUEST"
	| "SERVICE_UNAVAILABLE";

/**
 * Standard error response structure
 */
export interface ErrorResponse {
	ok: false;
	error: {
		code: ErrorCode;
		message: string;
		details?: Record<string, unknown>;
	};
}

/**
 * Standard success response structure
 */
export interface SuccessResponse<T = unknown> {
	ok: true;
	data: T;
}

/**
 * API response type
 */
export type ApiResponse<T = unknown> = SuccessResponse<T> | ErrorResponse;

/**
 * Custom error class for application errors
 */
export class AppError extends Error {
	constructor(
		public code: ErrorCode,
		message: string,
		public statusCode: number,
		public details?: Record<string, unknown>,
	) {
		super(message);
		this.name = "AppError";
		Error.captureStackTrace(this, this.constructor);
	}
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(
	code: ErrorCode,
	message: string,
	details?: Record<string, unknown>,
): ErrorResponse {
	return {
		ok: false,
		error: {
			code,
			message,
			...(details && { details }),
		},
	};
}

/**
 * Create a standardized success response
 */
export function createSuccessResponse<T>(data: T): SuccessResponse<T> {
	return {
		ok: true,
		data,
	};
}

/**
 * Map HTTP status code to error code
 */
export function getErrorCodeFromStatus(status: number): ErrorCode {
	switch (status) {
		case 400:
			return "BAD_REQUEST";
		case 401:
			return "UNAUTHORIZED";
		case 403:
			return "FORBIDDEN";
		case 404:
			return "NOT_FOUND";
		case 409:
			return "CONFLICT";
		case 429:
			return "RATE_LIMIT_EXCEEDED";
		case 503:
			return "SERVICE_UNAVAILABLE";
		default:
			return "INTERNAL_ERROR";
	}
}

/**
 * Pre-defined error responses for common scenarios
 */
export const ErrorResponses = {
	ValidationError: (message: string, details?: Record<string, unknown>) =>
		createErrorResponse("VALIDATION_ERROR", message, details),

	Unauthorized: (message = "Unauthorized access") => createErrorResponse("UNAUTHORIZED", message),

	Forbidden: (message = "Access forbidden") => createErrorResponse("FORBIDDEN", message),

	NotFound: (resource = "Resource", message?: string) =>
		createErrorResponse("NOT_FOUND", message || `${resource} not found`),

	Conflict: (message: string) => createErrorResponse("CONFLICT", message),

	RateLimitExceeded: (message = "Rate limit exceeded. Please try again later.") =>
		createErrorResponse("RATE_LIMIT_EXCEEDED", message),

	AccountLocked: (minutes?: number) =>
		createErrorResponse(
			"ACCOUNT_LOCKED",
			minutes
				? `Account locked. Try again in ${minutes} minutes.`
				: "Account locked due to too many failed attempts.",
		),

	InvalidCredentials: (message = "Invalid credentials") => createErrorResponse("INVALID_CREDENTIALS", message),

	ExpiredToken: (message = "Token has expired") => createErrorResponse("EXPIRED_TOKEN", message),

	InternalError: (message = "Internal server error") => createErrorResponse("INTERNAL_ERROR", message),

	BadRequest: (message: string) => createErrorResponse("BAD_REQUEST", message),

	ServiceUnavailable: (message = "Service temporarily unavailable") =>
		createErrorResponse("SERVICE_UNAVAILABLE", message),
};

/**
 * Check if a response is an error response
 */
export function isErrorResponse(response: unknown): response is ErrorResponse {
	return (
		typeof response === "object" &&
		response !== null &&
		"ok" in response &&
		response.ok === false &&
		"error" in response
	);
}

/**
 * Check if a response is a success response
 */
export function isSuccessResponse<T>(response: unknown): response is SuccessResponse<T> {
	return (
		typeof response === "object" &&
		response !== null &&
		"ok" in response &&
		response.ok === true &&
		"data" in response
	);
}
