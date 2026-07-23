import { FaqEditorPage } from "@/components/faq-sources/faq-editor-page";
import {
	prefetchFaqEditorPageData,
	prefetchTrainingShell,
} from "../../_lib/prefetch";

type PageProps = {
	params: Promise<{
		websiteSlug: string;
		knowledgeId: string;
	}>;
};

export default async function Page({ params }: PageProps) {
	const { websiteSlug, knowledgeId } = await params;

	await prefetchTrainingShell(websiteSlug);
	await prefetchFaqEditorPageData(websiteSlug, knowledgeId);

	return <FaqEditorPage knowledgeId={knowledgeId} />;
}
