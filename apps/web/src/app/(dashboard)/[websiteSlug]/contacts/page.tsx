import { ensureWebsiteAccess } from "@/lib/auth/website-access";
import { prefetch, trpc } from "@/lib/trpc/server";
import { ContactsPageContent } from "./contacts-page-content";

type DashboardPageProps = {
	params: Promise<{
		websiteSlug: string;
	}>;
};

export default async function ContactsPage({ params }: DashboardPageProps) {
	const { websiteSlug } = await params;

	await ensureWebsiteAccess(websiteSlug);
	await prefetch(
		trpc.contact.list.queryOptions({ websiteSlug, page: 1, limit: 25 })
	);

	return <ContactsPageContent websiteSlug={websiteSlug} />;
}
