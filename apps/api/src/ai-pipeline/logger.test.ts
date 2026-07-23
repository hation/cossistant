import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { logAiPipeline } from "./logger";

const originalConsole = {
	log: console.log,
	warn: console.warn,
	error: console.error,
};

function setupConsoleSpies() {
	const logSpy = mock(() => {});
	const warnSpy = mock(() => {});
	const errorSpy = mock(() => {});

	console.log = logSpy as unknown as typeof console.log;
	console.warn = warnSpy as unknown as typeof console.warn;
	console.error = errorSpy as unknown as typeof console.error;

	return { logSpy, warnSpy, errorSpy };
}

describe("logAiPipeline", () => {
	let logSpy: ReturnType<typeof mock>;
	let warnSpy: ReturnType<typeof mock>;
	let errorSpy: ReturnType<typeof mock>;

	beforeEach(() => {
		const spies = setupConsoleSpies();
		logSpy = spies.logSpy;
		warnSpy = spies.warnSpy;
		errorSpy = spies.errorSpy;
	});

	afterEach(() => {
		console.log = originalConsole.log;
		console.warn = originalConsole.warn;
		console.error = originalConsole.error;
	});

	it("formats prefix and key-value fields", () => {
		logAiPipeline({
			area: "primary",
			event: "start",
			conversationId: "conv-1",
			fields: {
				stage: "intake",
				attempt: 2,
				humanActive: false,
			},
		});

		expect(logSpy).toHaveBeenCalledTimes(1);
		expect(logSpy).toHaveBeenCalledWith(
			"[ai-pipeline:primary] evt=start conv=conv-1 stage=intake attempt=2 humanActive=false"
		);
	});

	it("skips empty and undefined field values", () => {
		logAiPipeline({
			area: "primary",
			event: "decision",
			conversationId: "conv-2",
			fields: {
				empty: "",
				nil: null,
				unknown: undefined,
				zero: 0,
				flag: false,
				reason: "needs follow up",
			},
		});

		expect(logSpy).toHaveBeenCalledTimes(1);
		const [line] = logSpy.mock.calls[0] as [string];
		expect(line).not.toContain("empty=");
		expect(line).not.toContain("nil=");
		expect(line).not.toContain("unknown=");
		expect(line).toContain("zero=0");
		expect(line).toContain("flag=false");
		expect(line).toContain('reason="needs follow up"');
	});

	it("routes output to the requested console level", () => {
		logAiPipeline({
			area: "usage",
			event: "ingest_failed",
			level: "warn",
			conversationId: "conv-3",
		});

		logAiPipeline({
			area: "primary",
			event: "error",
			level: "error",
			conversationId: "conv-3",
		});

		expect(warnSpy).toHaveBeenCalledTimes(1);
		expect(errorSpy).toHaveBeenCalledTimes(1);
		expect(logSpy).toHaveBeenCalledTimes(0);
	});

	it("includes error object for warn/error when provided", () => {
		const warningError = new Error("warn");
		const fatalError = new Error("fatal");

		logAiPipeline({
			area: "usage",
			event: "timeline_failed",
			level: "warn",
			conversationId: "conv-4",
			error: warningError,
		});
		logAiPipeline({
			area: "primary",
			event: "error",
			level: "error",
			conversationId: "conv-4",
			error: fatalError,
		});

		expect(warnSpy).toHaveBeenCalledTimes(1);
		expect(errorSpy).toHaveBeenCalledTimes(1);
		expect(warnSpy.mock.calls[0]?.[1]).toBe(warningError);
		expect(errorSpy.mock.calls[0]?.[1]).toBe(fatalError);
	});

	it("omits error object when not provided", () => {
		logAiPipeline({
			area: "usage",
			event: "ingest_failed",
			level: "warn",
			conversationId: "conv-5",
		});

		expect(warnSpy).toHaveBeenCalledTimes(1);
		expect(warnSpy.mock.calls[0]).toHaveLength(1);
	});
});
