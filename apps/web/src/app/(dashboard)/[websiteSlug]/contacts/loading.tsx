import { Button } from "@/components/ui/button";
import { Page, PageHeader, PageHeaderTitle } from "@/components/ui/layout";
import { Skeleton } from "@/components/ui/skeleton";
import { ContactsTableSkeleton } from "./contacts-table-skeleton";

export default function Loading() {
	return (
		<Page className="relative flex flex-col gap-6">
			<PageHeader>
				<PageHeaderTitle>Contacts</PageHeaderTitle>
			</PageHeader>
			<div className="flex flex-col gap-5">
				<ContactsTableSkeleton />
				<div className="flex flex-col items-center justify-between gap-3 px-5 py-20 sm:flex-row">
					<Skeleton className="h-4 w-48" />
					<div className="flex items-center gap-2">
						<Button disabled size="sm" variant="outline">
							Previous
						</Button>
						<Skeleton className="h-5 w-12" />
						<Button disabled size="sm" variant="outline">
							Next
						</Button>
					</div>
				</div>
			</div>
		</Page>
	);
}
