import { WebListPage } from "@/components/web-sources/web-list-page";
import {
	prefetchTrainingShell,
	prefetchWebListPageData,
} from "../_lib/prefetch";

type PageProps = {
	params: Promise<{
		websiteSlug: string;
	}>;
};

export default async function Page({ params }: PageProps) {
	const { websiteSlug } = await params;

	await prefetchTrainingShell(websiteSlug);
	await prefetchWebListPageData(websiteSlug);

	return <WebListPage />;
}
