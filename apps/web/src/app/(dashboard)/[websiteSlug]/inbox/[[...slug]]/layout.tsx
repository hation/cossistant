import { InboxNavigationSidebar } from "@/components/ui/layout/sidebars/inbox-navigation";

export default function Layout({ children }: { children: React.ReactNode }) {
	return (
		<>
			<InboxNavigationSidebar />
			{children}
		</>
	);
}
