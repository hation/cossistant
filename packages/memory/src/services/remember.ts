import { embed } from "ai";
import { MemoryQueryError } from "../errors";
import type { MemoryRepository } from "../repositories/memory-repository";
import type { MemoryModels, RememberInput, RememberResult } from "../types";
import { normalizeRememberInput } from "../validation";

async function generateMemoryEmbedding(
	models: MemoryModels | undefined,
	content: string
): Promise<number[] | undefined> {
	if (!models?.embed) {
		return;
	}

	try {
		const result = await embed({
			model: models.embed,
			value: content,
		});

		return result.embedding;
	} catch (cause) {
		throw new MemoryQueryError("Failed to generate memory embedding", {
			cause,
		});
	}
}

export async function rememberMemory(params: {
	input: RememberInput;
	models?: MemoryModels;
	now: () => Date;
	repository: MemoryRepository;
}): Promise<RememberResult> {
	const normalized = normalizeRememberInput(params.input, params.now);
	const embedding = await generateMemoryEmbedding(
		params.models,
		normalized.content
	);
	const row = await params.repository.insertMemoryRecord({
		content: normalized.content,
		metadata: normalized.metadata,
		priority: normalized.priority,
		embedding,
		source: normalized.source,
		createdAt: normalized.createdAt,
		updatedAt: normalized.updatedAt,
	});

	return {
		id: row.id,
		createdAt: row.createdAt,
	};
}
