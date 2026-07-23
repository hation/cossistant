import { MemoryValidationError } from "./errors";
import type {
	ContextInput,
	ForgetInput,
	MemoryMetadata,
	MemoryMetadataValue,
	MemoryWhere,
	RememberInput,
} from "./types";
import { isObjectLike, toDate } from "./utils";

export const DEFAULT_CONTEXT_LIMIT = 8;
export const MAX_CONTEXT_LIMIT = 50;
export const RESERVED_SUMMARY_KIND = "summary";

const VALID_SOURCES = new Set(["agent", "user", "human", "system", "tool"]);

function normalizeMetadataValue(
	value: unknown,
	path: string
): MemoryMetadataValue {
	if (value === null) {
		return null;
	}

	switch (typeof value) {
		case "string":
			return value;
		case "boolean":
			return value;
		case "number":
			if (!Number.isFinite(value)) {
				throw new MemoryValidationError(
					`${path} numbers must be finite JSON-compatible values`
				);
			}
			return value;
		default:
			throw new MemoryValidationError(
				`${path} must be a flat metadata value (string, number, boolean, or null)`
			);
	}
}

export function normalizeMemoryMetadata(
	value: unknown,
	path = "metadata"
): MemoryMetadata {
	if (value === undefined) {
		return {};
	}

	if (!isObjectLike(value)) {
		throw new MemoryValidationError(`${path} must be a flat key-value object`);
	}

	return Object.entries(value).reduce<MemoryMetadata>(
		(acc, [key, entryValue]) => {
			acc[key] = normalizeMetadataValue(entryValue, `${path}.${key}`);
			return acc;
		},
		{}
	);
}

function isLogicalWhereNode(
	value: Record<string, unknown>,
	key: "and" | "or"
): value is Record<typeof key, unknown[]> {
	return Object.keys(value).length === 1 && Array.isArray(value[key]);
}

export function normalizeMemoryWhere(
	value: unknown,
	path = "where"
): MemoryWhere {
	if (!isObjectLike(value)) {
		throw new MemoryValidationError(`${path} must be an object`);
	}

	if (isLogicalWhereNode(value, "and")) {
		if (value.and.length === 0) {
			throw new MemoryValidationError(`${path}.and must not be empty`);
		}

		return {
			and: value.and.map((entry, index) =>
				normalizeMemoryWhere(entry, `${path}.and[${index}]`)
			),
		};
	}

	if (isLogicalWhereNode(value, "or")) {
		if (value.or.length === 0) {
			throw new MemoryValidationError(`${path}.or must not be empty`);
		}

		return {
			or: value.or.map((entry, index) =>
				normalizeMemoryWhere(entry, `${path}.or[${index}]`)
			),
		};
	}

	const normalized = normalizeMemoryMetadata(value, path);

	if (Object.keys(normalized).length === 0) {
		throw new MemoryValidationError(`${path} must not be empty`);
	}

	return normalized;
}

export function normalizeRememberInput(
	input: RememberInput,
	now: () => Date
): {
	content: string;
	metadata: MemoryMetadata;
	priority: number;
	source: RememberInput["source"];
	createdAt: Date;
	updatedAt: Date;
} {
	if (!isObjectLike(input)) {
		throw new MemoryValidationError("remember input must be an object");
	}

	if (typeof input.content !== "string" || input.content.trim().length === 0) {
		throw new MemoryValidationError(
			"remember content must be a non-empty string"
		);
	}

	const metadata = normalizeMemoryMetadata(input.metadata);
	const priority = input.priority ?? 1;

	if (!Number.isInteger(priority) || priority <= 0) {
		throw new MemoryValidationError(
			"remember priority must be a positive integer"
		);
	}

	const createdAt =
		input.createdAt === undefined ? now() : toDate(input.createdAt);

	if (createdAt === null) {
		throw new MemoryValidationError("remember createdAt must be a valid date");
	}

	const source = input.source ?? "system";

	if (!VALID_SOURCES.has(source)) {
		throw new MemoryValidationError(
			"remember source must be one of: agent, user, human, system, tool"
		);
	}

	return {
		content: input.content,
		metadata,
		priority,
		source,
		createdAt,
		updatedAt: new Date(createdAt),
	};
}

export function normalizeContextInput(input: ContextInput): {
	where?: MemoryWhere;
	text?: string;
	limit: number;
	includeSummary: boolean;
} {
	if (!isObjectLike(input)) {
		throw new MemoryValidationError("context input must be an object");
	}

	const where =
		input.where === undefined ? undefined : normalizeMemoryWhere(input.where);

	let text: string | undefined;
	if (input.text !== undefined) {
		if (typeof input.text !== "string" || input.text.trim().length === 0) {
			throw new MemoryValidationError(
				"context text must be a non-empty string when provided"
			);
		}
		text = input.text;
	}

	const limit = input.limit ?? DEFAULT_CONTEXT_LIMIT;

	if (!Number.isInteger(limit) || limit <= 0 || limit > MAX_CONTEXT_LIMIT) {
		throw new MemoryValidationError(
			`context limit must be an integer between 1 and ${MAX_CONTEXT_LIMIT}`
		);
	}

	if (
		input.includeSummary !== undefined &&
		typeof input.includeSummary !== "boolean"
	) {
		throw new MemoryValidationError(
			"context includeSummary must be a boolean when provided"
		);
	}

	return {
		where,
		text,
		limit,
		includeSummary: input.includeSummary ?? false,
	};
}

export function normalizeForgetInput(input: ForgetInput): {
	id?: string;
	where?: MemoryWhere;
} {
	if (!isObjectLike(input)) {
		throw new MemoryValidationError("forget input must be an object");
	}

	const hasId = Object.hasOwn(input, "id");
	const hasWhere = Object.hasOwn(input, "where");

	if (hasId === hasWhere) {
		throw new MemoryValidationError(
			"forget input must include exactly one of id or where"
		);
	}

	if (hasId) {
		const id = "id" in input ? input.id : undefined;

		if (typeof id !== "string" || id.trim().length === 0) {
			throw new MemoryValidationError("forget id must be a non-empty string");
		}

		return { id };
	}

	return {
		where: normalizeMemoryWhere("where" in input ? input.where : undefined),
	};
}
