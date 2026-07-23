import { compileMemoryWhere } from "../filters";
import type { MemoryRepository } from "../repositories/memory-repository";
import type { ForgetInput, ForgetResult } from "../types";
import { normalizeForgetInput } from "../validation";

export async function forgetMemory(params: {
	input: ForgetInput;
	repository: MemoryRepository;
}): Promise<ForgetResult> {
	const normalized = normalizeForgetInput(params.input);

	if (normalized.id !== undefined) {
		return {
			deletedCount: await params.repository.deleteById(normalized.id),
		};
	}

	const where = compileMemoryWhere(normalized.where);

	if (where === undefined) {
		return { deletedCount: 0 };
	}

	return {
		deletedCount: await params.repository.deleteByWhere(where),
	};
}
