import { FaqListPage } from "@/components/faq-sources/faq-list-page";
import {
	prefetchFaqListPageData,
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
	await prefetchFaqListPageData(websiteSlug);

	return <FaqListPage />;
}
