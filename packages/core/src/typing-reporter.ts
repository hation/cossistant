/**
 * Shared typing reporter logic for throttling and scheduling typing events.
 * This is a framework-agnostic utility used by both React widget and dashboard hooks.
 */

/** Minimum interval between typing event sends (ms) */
export const TYPING_SEND_INTERVAL_MS = 800;

/** Keep-alive interval for typing events (ms) */
export const TYPING_KEEP_ALIVE_MS = 4000;

/** Delay before auto-stop typing on inactivity (ms) */
export const TYPING_STOP_DELAY_MS = 2000;

/** Maximum length for typing preview text */
export const TYPING_PREVIEW_MAX_LENGTH = 2000;

type TypingReporterState = {
	isActive: boolean;
	lastSentAt: number;
	latestPreview: string;
};

type TypingReporterTimers = {
	keepAlive: ReturnType<typeof setTimeout> | null;
	stopTyping: ReturnType<typeof setTimeout> | null;
};

type TypingReporterSendFn = (
	isTyping: boolean,
	preview?: string | null
) => void | Promise<void>;

export type TypingReporterConfig = {
	/** Function to send the typing event */
	send: TypingReporterSendFn;
	/** Custom send interval (default: 800ms) */
	sendIntervalMs?: number;
	/** Custom keep-alive interval (default: 4000ms) */
	keepAliveMs?: number;
	/** Custom stop delay (default: 2000ms) */
	stopDelayMs?: number;
	/** Maximum preview length (default: 2000) */
	previewMaxLength?: number;
	/** Whether to include preview text (default: true) */
	includePreview?: boolean;
};

export type TypingReporter = {
	/** Call when input value changes */
	handleInputChange: (value: string) => void;
	/** Call when message is submitted */
	handleSubmit: () => void;
	/** Force stop typing indicator */
	stop: () => void;
	/** Clean up timers (call on unmount) */
	dispose: () => void;
	/** Get current state (for testing) */
	getState: () => TypingReporterState;
};

/**
 * Creates a typing reporter instance that handles throttling and scheduling
 * of typing events.
 *
 * @example
 * ```ts
 * const reporter = createTypingReporter({
 *   send: async (isTyping, preview) => {
 *     await api.sendTypingEvent({ isTyping, preview });
 *   },
 * });
 *
 * // On input change
 * reporter.handleInputChange(inputValue);
 *
 * // On submit
 * reporter.handleSubmit();
 *
 * // On unmount
 * reporter.dispose();
 * ```
 */
export function createTypingReporter(
	config: TypingReporterConfig
): TypingReporter {
	const {
		send,
		sendIntervalMs = TYPING_SEND_INTERVAL_MS,
		keepAliveMs = TYPING_KEEP_ALIVE_MS,
		stopDelayMs = TYPING_STOP_DELAY_MS,
		previewMaxLength = TYPING_PREVIEW_MAX_LENGTH,
		includePreview = true,
	} = config;

	const state: TypingReporterState = {
		isActive: false,
		lastSentAt: 0,
		latestPreview: "",
	};

	const timers: TypingReporterTimers = {
		keepAlive: null,
		stopTyping: null,
	};

	const clearKeepAlive = () => {
		if (timers.keepAlive) {
			clearTimeout(timers.keepAlive);
			timers.keepAlive = null;
		}
	};

	const clearStopTypingTimeout = () => {
		if (timers.stopTyping) {
			clearTimeout(timers.stopTyping);
			timers.stopTyping = null;
		}
	};

	const sendTyping = (isTyping: boolean) => {
		const preview = includePreview && isTyping ? state.latestPreview : null;
		void Promise.resolve(send(isTyping, preview)).catch((error) => {
			console.error("[TypingReporter] Failed to send typing event", error);
		});
	};

	const scheduleKeepAlive = () => {
		clearKeepAlive();
		timers.keepAlive = setTimeout(() => {
			if (state.isActive) {
				sendTyping(true);
				scheduleKeepAlive();
			}
		}, keepAliveMs);
	};

	const scheduleStopTyping = () => {
		clearStopTypingTimeout();
		timers.stopTyping = setTimeout(() => {
			if (state.isActive) {
				state.isActive = false;
				clearKeepAlive();
				sendTyping(false);
			}
		}, stopDelayMs);
	};

	const handleInputChange = (value: string) => {
		const trimmed = value.trim();
		state.latestPreview = trimmed.slice(0, previewMaxLength);
		const now =
			typeof globalThis !== "undefined" && "Date" in globalThis
				? Date.now()
				: 0;

		if (trimmed.length === 0) {
			if (state.isActive) {
				state.isActive = false;
				state.lastSentAt = now;
				clearKeepAlive();
				clearStopTypingTimeout();
				sendTyping(false);
			}
			return;
		}

		// Schedule auto-stop after inactivity
		scheduleStopTyping();

		if (!state.isActive) {
			state.isActive = true;
			state.lastSentAt = now;
			sendTyping(true);
			scheduleKeepAlive();
			return;
		}

		if (now - state.lastSentAt >= sendIntervalMs) {
			state.lastSentAt = now;
			sendTyping(true);
			scheduleKeepAlive();
		}
	};

	const handleSubmit = () => {
		if (!state.isActive) {
			return;
		}

		state.isActive = false;
		state.lastSentAt =
			typeof globalThis !== "undefined" && "Date" in globalThis
				? Date.now()
				: 0;
		clearKeepAlive();
		clearStopTypingTimeout();
		sendTyping(false);
	};

	const stop = () => {
		if (!state.isActive) {
			return;
		}

		state.isActive = false;
		state.lastSentAt =
			typeof globalThis !== "undefined" && "Date" in globalThis
				? Date.now()
				: 0;
		clearKeepAlive();
		clearStopTypingTimeout();
		sendTyping(false);
	};

	const dispose = () => {
		if (state.isActive) {
			sendTyping(false);
		}
		clearKeepAlive();
		clearStopTypingTimeout();
	};

	const getState = () => ({ ...state });

	return {
		handleInputChange,
		handleSubmit,
		stop,
		dispose,
		getState,
	};
}
