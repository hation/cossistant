import { ensureWebsiteAccess } from "@/lib/auth/website-access";
import { getConversationDebugJsonResponse } from "../_conversation-debug-json";
import InboxClientRouter from "./client-router";

type DashboardPageProps = {
	params: Promise<{
		websiteSlug: string;
		slug: string[];
	}>;
};

export default async function InboxPage({ params }: DashboardPageProps) {
	const { websiteSlug, slug } = await params;

	await ensureWebsiteAccess(websiteSlug);

	return <InboxClientRouter websiteSlug={websiteSlug} />;
}
