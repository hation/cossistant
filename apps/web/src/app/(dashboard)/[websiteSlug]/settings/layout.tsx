import { SettingsNavigationSidebar } from "@/components/ui/layout/sidebars/settings-navigation";

type SettingsLayoutProps = {
	children: React.ReactNode;
};

export default function Layout({ children }: SettingsLayoutProps) {
	return (
		<>
			<SettingsNavigationSidebar />
			{children}
		</>
	);
}
