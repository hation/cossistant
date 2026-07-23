import { findNeighbour } from "fumadocs-core/page-tree";
import { GITHUB_URL } from "@/constants";
import { getDocsWidgetRelease } from "@/lib/docs-widget-release";
import { source } from "@/lib/source";
import { DocsTopBarClient } from "./docs-topbar.client";

type DocsTopBarProps = {
	currentPageUrl: string;
	currentPagePath: string;
};

export async function DocsTopBar({
	currentPageUrl,
	currentPagePath,
}: DocsTopBarProps) {
	const [neighbours, release] = await Promise.all([
		findNeighbour(source.pageTree, currentPageUrl),
		getDocsWidgetRelease(),
	]);

	return (
		<DocsTopBarClient
			githubUrl={`${GITHUB_URL}/blob/main/apps/web/content/docs/${currentPagePath}`}
			latestRelease={release.latestRelease}
			markdownUrl={`${currentPageUrl}.mdx`}
			next={neighbours.next}
			previous={neighbours.previous}
			widgetVersion={release.widgetVersion}
		/>
	);
}
