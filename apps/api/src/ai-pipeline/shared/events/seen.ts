import type { Database } from "@api/db";
import { markConversationAsSeen } from "@api/db/mutations/conversation";
import type { ConversationSelect } from "@api/db/schema/conversation";
import { emitConversationSeenEvent } from "@api/utils/conversation-realtime";

export async function emitPipelineSeen(params: {
	db: Database;
	conversation: ConversationSelect;
	aiAgentId: string;
}): Promise<void> {
	const actor = {
		type: "ai_agent" as const,
		aiAgentId: params.aiAgentId,
	};

	const lastSeenAt = await markConversationAsSeen(params.db, {
		conversation: params.conversation,
		actor,
	});

	await emitConversationSeenEvent({
		conversation: params.conversation,
		actor,
		lastSeenAt,
	});
}
