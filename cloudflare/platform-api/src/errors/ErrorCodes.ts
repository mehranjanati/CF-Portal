export const ErrorCodes = {
	VALIDATION_ERROR: 'VALIDATION_ERROR',
	NOT_FOUND: 'NOT_FOUND',
	INTERNAL_ERROR: 'INTERNAL_ERROR',
	AUTH_ERROR: 'AUTH_ERROR',
	TENANT_ERROR: 'TENANT_ERROR',
	CONFLICT: 'CONFLICT'
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];