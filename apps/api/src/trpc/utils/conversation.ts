import type { Database } from "@api/db";
import { getConversationById } from "@api/db/queries/conversation";
import { getWebsiteBySlugWithAccess } from "@api/db/queries/website";
import { TRPCError } from "@trpc/server";

export async function loadConversationContext(
	db: Database,
	userId: string,
	input: { websiteSlug: string; conversationId: string }
) {
	const [websiteData, conversationRecord] = await Promise.all([
		getWebsiteBySlugWithAccess(db, {
			userId,
			websiteSlug: input.websiteSlug,
		}),
		getConversationById(db, { conversationId: input.conversationId }),
	]);

	if (!websiteData) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Website not found or access denied",
		});
	}

	if (!conversationRecord || conversationRecord.websiteId !== websiteData.id) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Conversation not found",
		});
	}

	return { website: websiteData, conversation: conversationRecord };
}
