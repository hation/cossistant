import { FileEditorPage } from "@/components/file-sources/file-editor-page";
import {
	prefetchFileEditorPageData,
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
	await prefetchFileEditorPageData(websiteSlug, knowledgeId);

	return <FileEditorPage knowledgeId={knowledgeId} />;
}
