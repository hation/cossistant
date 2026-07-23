export type AiPipelineLogLevel = "log" | "warn" | "error";

export type AiPipelineLogFields = Record<
	string,
	string | number | boolean | null | undefined
>;

function shouldIncludeFieldValue(
	value: string | number | boolean | null | undefined
): value is string | number | boolean {
	return !(
		value === undefined ||
		value === null ||
		(typeof value === "string" && value.length === 0)
	);
}

function formatFieldValue(value: string | number | boolean): string {
	if (typeof value === "string") {
		if (/[\s="]/.test(value)) {
			return JSON.stringify(value);
		}

		return value;
	}

	return String(value);
}

export function logAiPipeline(params: {
	area: string;
	event: string;
	conversationId?: string;
	level?: AiPipelineLogLevel;
	fields?: AiPipelineLogFields;
	error?: unknown;
}): void {
	const level = params.level ?? "log";
	const parts = [`[ai-pipeline:${params.area}]`, `evt=${params.event}`];

	if (params.conversationId) {
		parts.push(`conv=${formatFieldValue(params.conversationId)}`);
	}

	if (params.fields) {
		for (const [key, value] of Object.entries(params.fields)) {
			if (!shouldIncludeFieldValue(value)) {
				continue;
			}

			parts.push(`${key}=${formatFieldValue(value)}`);
		}
	}

	const line = parts.join(" ");
	if (params.error !== undefined && (level === "warn" || level === "error")) {
		console[level](line, params.error);
		return;
	}

	console[level](line);
}
