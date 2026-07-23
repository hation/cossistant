import type { Database } from "@api/db";
import { updateAiAgentModel } from "@api/db/queries/ai-agent";
import type { AiAgentSelect } from "@api/db/schema/ai-agent";
import {
	type ResolvedAiAgentModel,
	resolveModelForExecution,
} from "@api/lib/ai-credits/config";
import { logAiPipeline } from "../../../logger";

type ResolveAndPersistModelInput = {
	db: Database;
	aiAgent: AiAgentSelect;
	conversationId: string;
};

export type ModelResolutionResult = {
	aiAgent: AiAgentSelect;
	modelResolution: ResolvedAiAgentModel;
};

export async function resolveAndPersistModel(
	input: ResolveAndPersistModelInput
): Promise<ModelResolutionResult> {
	const modelResolution = resolveModelForExecution(input.aiAgent.model);

	if (!modelResolution.modelMigrationApplied) {
		return {
			aiAgent: input.aiAgent,
			modelResolution,
		};
	}

	logAiPipeline({
		area: "intake",
		event: "model_migrate",
		level: "warn",
		conversationId: input.conversationId,
		fields: {
			fromModel: modelResolution.modelIdOriginal,
			toModel: modelResolution.modelIdResolved,
		},
	});

	try {
		const persisted = await updateAiAgentModel(input.db, {
			aiAgentId: input.aiAgent.id,
			model: modelResolution.modelIdResolved,
		});

		if (persisted) {
			return {
				aiAgent: persisted,
				modelResolution,
			};
		}
	} catch (error) {
		logAiPipeline({
			area: "intake",
			event: "model_persist_failed",
			level: "warn",
			conversationId: input.conversationId,
			fields: {
				fromModel: modelResolution.modelIdOriginal,
				toModel: modelResolution.modelIdResolved,
			},
			error,
		});
	}

	return {
		aiAgent: {
			...input.aiAgent,
			model: modelResolution.modelIdResolved,
		},
		modelResolution,
	};
}
