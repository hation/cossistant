import {
	createMemoryRepository,
	type MemoryRepository,
} from "./repositories/memory-repository";
import { loadMemoryContext } from "./services/context";
import { forgetMemory } from "./services/forget";
import { rememberMemory } from "./services/remember";
import type {
	ContextInput,
	ContextResult,
	ForgetInput,
	ForgetResult,
	MemoryEmbeddingModel,
	MemoryModels,
	MemoryOptions,
	MemorySummarizeModel,
	RememberInput,
	RememberResult,
} from "./types";
import { isObjectLike } from "./utils";

function assertSupportedDb(db: MemoryOptions["db"]): void {
	if (!isObjectLike(db)) {
		throw new TypeError(
			"Memory expects a Drizzle PostgreSQL database instance"
		);
	}

	const hasQuerySurface =
		typeof db.execute === "function" &&
		typeof db.select === "function" &&
		typeof db.insert === "function" &&
		typeof db.update === "function" &&
		typeof db.delete === "function" &&
		typeof db.transaction === "function";

	if (!hasQuerySurface) {
		throw new TypeError(
			"Memory expects a Drizzle PostgreSQL database instance"
		);
	}
}

function assertModelInstance(
	model: MemoryEmbeddingModel | MemorySummarizeModel | undefined,
	label: "embed" | "summarize"
): void {
	if (model === undefined) {
		return;
	}

	if (typeof model === "string" || !isObjectLike(model)) {
		throw new TypeError(
			`Memory models.${label} must be an AI SDK model instance, not a model id`
		);
	}
}

function assertSupportedModels(models: MemoryModels | undefined): void {
	if (models === undefined) {
		return;
	}

	assertModelInstance(models.embed, "embed");
	assertModelInstance(models.summarize, "summarize");
}

export class Memory {
	private readonly db: MemoryOptions["db"];
	private readonly models?: MemoryModels;
	private readonly now: () => Date;
	private readonly repository: MemoryRepository;

	constructor(options: MemoryOptions) {
		assertSupportedDb(options.db);
		assertSupportedModels(options.models);

		if (options.now !== undefined && typeof options.now !== "function") {
			throw new TypeError("Memory now must be a function that returns a Date");
		}

		this.db = options.db;
		this.models = options.models;
		this.now = options.now ?? (() => new Date());
		this.repository = createMemoryRepository(this.db);
	}

	remember(input: RememberInput): Promise<RememberResult> {
		return rememberMemory({
			input,
			models: this.models,
			now: this.now,
			repository: this.repository,
		});
	}

	context(input: ContextInput): Promise<ContextResult> {
		return loadMemoryContext({
			input,
			models: this.models,
			now: this.now,
			repository: this.repository,
		});
	}

	forget(input: ForgetInput): Promise<ForgetResult> {
		return forgetMemory({
			input,
			repository: this.repository,
		});
	}
}
