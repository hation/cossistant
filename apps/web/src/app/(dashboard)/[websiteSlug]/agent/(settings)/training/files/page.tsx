import { FileListPage } from "@/components/file-sources/file-list-page";
import {
	prefetchFileListPageData,
	prefetchTrainingShell,
} from "../_lib/prefetch";

type PageProps = {
	params: Promise<{
		websiteSlug: string;
	}>;
};

export default async function Page({ params }: PageProps) {
	const { websiteSlug } = await params;

	await prefetchTrainingShell(websiteSlug);
	await prefetchFileListPageData(websiteSlug);

	return <FileListPage />;
}
