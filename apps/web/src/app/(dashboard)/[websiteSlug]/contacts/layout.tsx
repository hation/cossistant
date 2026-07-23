import { ContactsNavigationSidebar } from "@/components/ui/layout/sidebars/contacts-navigation";

export default function Layout({ children }: { children: React.ReactNode }) {
	return (
		<>
			<ContactsNavigationSidebar />
			{children}
		</>
	);
}
