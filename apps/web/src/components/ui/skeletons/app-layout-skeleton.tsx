import { Page, PageHeader, PageHeaderTitle } from "@/components/ui/layout";
import { cn } from "../../../lib/utils";
import { FakeCentralContainer } from "../../landing/fake-dashboard/fake-layout";
import { FakeNavigationTopbar } from "../../landing/fake-dashboard/fake-navigation-topbar";
import { FakeInboxNavigationSidebar } from "../../landing/fake-dashboard/fake-sidebar/inbox";

export function AppLayoutSkeleton({ className }: { className?: string }) {
	return (
		<div
			className={cn(
				"@container relative flex h-full w-full flex-col overflow-hidden bg-background-100 dark:bg-background",
				className
			)}
		>
			<FakeNavigationTopbar />
			<FakeCentralContainer>
				<FakeInboxNavigationSidebar
					activeView="inbox"
					open
					statusCounts={{ open: 0, resolved: 0, spam: 0, archived: 0 }}
				/>
				<Page className="relative px-0">
					<PageHeader className="px-4">
						<div className="flex items-center gap-2">
							<PageHeaderTitle className="capitalize">Inbox</PageHeaderTitle>
						</div>
					</PageHeader>
				</Page>
			</FakeCentralContainer>
		</div>
	);
}
