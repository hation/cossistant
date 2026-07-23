import { KnowledgeClarificationProposalPage } from "@/components/knowledge-clarification/proposal-page";
import {
	prefetchFaqProposalPageData,
	prefetchTrainingShell,
} from "../../../_lib/prefetch";

type PageProps = {
	params: Promise<{
		websiteSlug: string;
		requestId: string;
	}>;
};

export default async function Page({ params }: PageProps) {
	const { websiteSlug, requestId } = await params;

	await prefetchTrainingShell(websiteSlug);
	await prefetchFaqProposalPageData(websiteSlug, requestId);

	return <KnowledgeClarificationProposalPage requestId={requestId} />;
}
