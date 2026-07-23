import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { ModelMessage } from "@api/lib/ai";
import type { GenerationRuntimeInput } from "../contracts";
import { emitGenerationDebugLog } from "./debug-log";

const SYSTEM_PROMPT_DEBUG_DIR = resolve(
	import.meta.dir,
	"../../../../../debug/system-prompts"
);

export async function writeGenerationSystemPromptDebugDump(params: {
	input: GenerationRuntimeInput;
	messages: ModelMessage[];
	systemPrompt: string;
}): Promise<void> {
	if (process.env.NODE_ENV === "production") {
		return;
	}

	const promptDir = join(
		SYSTEM_PROMPT_DEBUG_DIR,
		params.input.conversation.id,
		params.input.triggerMessageId
	);
	const filePath = join(promptDir, "system-prompt.md");
	const fileContents = `## Messages Sent To Model
\`\`\`json
${JSON.stringify(params.messages, null, 2)}
\`\`\`

## System Prompt
${params.systemPrompt}`;

	try {
		await mkdir(promptDir, { recursive: true });
		await writeFile(filePath, fileContents, "utf8");
	} catch (error) {
		emitGenerationDebugLog(
			params.input,
			"warn",
			`[ai-pipeline:generation] conv=${params.input.conversation.id} workflowRunId=${params.input.workflowRunId} evt=system_prompt_dump_failed`,
			error
		);
	}
}
