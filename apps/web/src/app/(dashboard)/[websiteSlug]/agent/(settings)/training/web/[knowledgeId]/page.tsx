import { WebPageDetail } from "@/components/web-sources/web-page-detail";
import {
	prefetchTrainingShell,
	prefetchWebPageDetailData,
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
	await prefetchWebPageDetailData(websiteSlug, knowledgeId);

	return <WebPageDetail knowledgeId={knowledgeId} />;
}
