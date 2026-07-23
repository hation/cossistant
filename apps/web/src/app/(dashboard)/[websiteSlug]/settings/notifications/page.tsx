import { PageContent } from "@/components/ui/layout";
import {
	SettingsHeader,
	SettingsPage,
	SettingsRow,
} from "@/components/ui/layout/settings-layout";
import { ensureWebsiteAccess } from "@/lib/auth/website-access";
import { MemberNotificationSettingsForm } from "./preferences-form";

type NotificationsSettingsPageProps = {
	params: Promise<{
		websiteSlug: string;
	}>;
};

export default async function NotificationsSettingsPage({
	params,
}: NotificationsSettingsPageProps) {
	const { websiteSlug } = await params;
	const { website } = await ensureWebsiteAccess(websiteSlug);

	return (
		<SettingsPage>
			<SettingsHeader>Notifications</SettingsHeader>
			<PageContent className="py-30">
				<SettingsRow
					description="Choose how you and your teammates hear about important activity."
					title="Your notifications"
				>
					<MemberNotificationSettingsForm websiteSlug={website.slug} />
				</SettingsRow>
			</PageContent>
		</SettingsPage>
	);
}
