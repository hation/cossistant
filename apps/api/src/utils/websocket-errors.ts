/**
 * WebSocket error handling utilities
 */

export const WebSocketErrorCode = {
	AUTHENTICATION_FAILED: 1008,
	IDENTIFICATION_REQUIRED: 1008,
	INVALID_MESSAGE_FORMAT: 1003,
	SERVER_ERROR: 1011,
} as const;

export type WebSocketErrorCode =
	(typeof WebSocketErrorCode)[keyof typeof WebSocketErrorCode];

export type WebSocketError = {
	code: WebSocketErrorCode;
	error: string;
	message: string;
	details?: unknown;
};

export function createWebSocketError(
	code: WebSocketErrorCode,
	error: string,
	message: string,
	details?: unknown
): WebSocketError {
	return {
		code,
		error,
		message,
		details,
	};
}

export const WEBSOCKET_ERRORS = {
	authenticationFailed: () =>
		createWebSocketError(
			WebSocketErrorCode.AUTHENTICATION_FAILED,
			"Authentication failed",
			"Authentication failed: Provide a valid API key or be signed in."
		),

	identificationRequired: () =>
		createWebSocketError(
			WebSocketErrorCode.IDENTIFICATION_REQUIRED,
			"Identification required",
			"Either authenticate with credentials or provide a visitor ID via X-Visitor-Id header or query parameter."
		),

	connectionNotAuthenticated: () =>
		createWebSocketError(
			WebSocketErrorCode.AUTHENTICATION_FAILED,
			"Connection not authenticated",
			"Please reconnect with valid authentication."
		),

	invalidEventType: (type?: string) =>
		createWebSocketError(
			WebSocketErrorCode.INVALID_MESSAGE_FORMAT,
			"Invalid event type",
			`Invalid event type: ${type || "unknown"}`
		),

	invalidMessageFormat: (error?: unknown) =>
		createWebSocketError(
			WebSocketErrorCode.INVALID_MESSAGE_FORMAT,
			"Invalid message format",
			"The message format is invalid. Please check your message structure.",
			error
		),

	serverError: (error?: unknown) =>
		createWebSocketError(
			WebSocketErrorCode.SERVER_ERROR,
			"Server error",
			"An unexpected server error occurred. Please try again later.",
			error
		),
};

export function isWebSocketError(error: unknown): error is WebSocketError {
	return (
		typeof error === "object" &&
		error !== null &&
		"code" in error &&
		"error" in error &&
		"message" in error
	);
}
