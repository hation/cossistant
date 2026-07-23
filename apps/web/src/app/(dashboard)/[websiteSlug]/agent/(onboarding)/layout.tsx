"use client";

import { BlurredAgentsSidebar } from "@/components/ui/layout/sidebars/blurred-agents-sidebar";
import { DEFAULT_SIDEBAR_WIDTH } from "@/hooks/use-sidebars";

type OnboardingLayoutProps = {
	children: React.ReactNode;
};

export default function OnboardingLayout({ children }: OnboardingLayoutProps) {
	return (
		<>
			<BlurredAgentsSidebar />
			{children}
			{/* Right placeholder for centering - matches sidebar width */}
			<div
				className="hidden shrink-0 lg:block"
				style={{ width: DEFAULT_SIDEBAR_WIDTH }}
			/>
		</>
	);
}
