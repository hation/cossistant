"use client";

import { AgentsNavigationSidebar } from "@/components/ui/layout/sidebars/agents-navigation";

type SettingsLayoutProps = {
	children: React.ReactNode;
};

export default function SettingsLayout({ children }: SettingsLayoutProps) {
	return (
		<>
			<AgentsNavigationSidebar />
			{children}
		</>
	);
}
