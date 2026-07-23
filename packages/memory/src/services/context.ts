import { embed } from "ai";
import { MemoryQueryError } from "../errors";
import { compileMemoryWhere } from "../filters";
import { mapRowToMemoryItem } from "../mappers";
import type { MemoryRepository } from "../repositories/memory-repository";
import { type MemoryCandidate, rankCandidates } from "../scoring";
import type { ContextInput, ContextResult, MemoryModels } from "../types";
import { DEFAULT_CONTEXT_LIMIT, normalizeContextInput } from "../validation";

const MIN_CANDIDATE_LIMIT = 25;
const MAX_CANDIDATE_LIMIT = 100;

function resolveStructuralCandidateLimit(limit: number): number {
	return Math.min(
		Math.max(limit * 8, MIN_CANDIDATE_LIMIT),
		MAX_CANDIDATE_LIMIT
	);
}

function resolveSemanticCandidateLimit(limit: number): number {
	return Math.min(
		Math.max(limit * 6, MIN_CANDIDATE_LIMIT),
		MAX_CANDIDATE_LIMIT
	);
}

async function buildQueryEmbedding(
	models: MemoryModels | undefined,
	text: string | undefined
): Promise<number[] | undefined> {
	if (!(text && models?.embed)) {
		return;
	}

	try {
		const result = await embed({
			model: models.embed,
			value: text,
		});

		return result.embedding;
	} catch (cause) {
		throw new MemoryQueryError("Failed to generate query embedding", { cause });
	}
}

function toCandidate(
	row: Parameters<typeof mapRowToMemoryItem>[0],
	similarity?: number | null
): MemoryCandidate {
	const item = mapRowToMemoryItem(row, similarity);

	return {
		id: item.id,
		content: item.content,
		metadata: item.metadata,
		priority: item.priority,
		createdAt: item.createdAt,
		updatedAt: item.updatedAt,
		similarity,
	};
}

export async function loadMemoryContext(params: {
	input: ContextInput;
	models?: MemoryModels;
	now: () => Date;
	repository: MemoryRepository;
}): Promise<ContextResult> {
	const normalized = normalizeContextInput(params.input);
	const limit = normalized.limit ?? DEFAULT_CONTEXT_LIMIT;
	const where = compileMemoryWhere(normalized.where);
	const queryEmbedding = await buildQueryEmbedding(
		params.models,
		normalized.text
	);

	const structuralCandidatesPromise =
		params.repository.findStructuralCandidates({
			where,
			limit: resolveStructuralCandidateLimit(limit),
		});

	const semanticCandidatesPromise =
		queryEmbedding === undefined
			? Promise.resolve([])
			: params.repository.findSemanticCandidates({
					where,
					limit: resolveSemanticCandidateLimit(limit),
					queryEmbedding,
				});

	const summaryPromise =
		normalized.includeSummary === true
			? params.repository.findStoredSummary({ where })
			: Promise.resolve(undefined);

	const [structuralRows, semanticRows, summaryRow] = await Promise.all([
		structuralCandidatesPromise,
		semanticCandidatesPromise,
		summaryPromise,
	]);

	const rankedItems = rankCandidates(
		[
			...structuralRows.map((row) => toCandidate(row)),
			...semanticRows.map((row) => toCandidate(row, row.similarity)),
		],
		params.now()
	).slice(0, limit);

	return {
		items: rankedItems,
		summary: summaryRow ? mapRowToMemoryItem(summaryRow).content : undefined,
	};
}
