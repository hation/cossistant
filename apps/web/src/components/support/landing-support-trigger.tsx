"use client";

import { Support } from "@cossistant/react";
import { LandingTriggerContent } from "./custom-trigger";

/**
 * Client Component wrapper for the landing page Support trigger.
 * This is needed because render props (function children) cannot be passed
 * from Server Components to Client Components in Next.js App Router.
 */
export function LandingSupportTrigger() {
	return (
		<Support
			apiUrl="http://localhost:8787/v1"
			wsUrl="ws://localhost:8787/ws"
			publicKey="pk_8bd6aaa329955e847f6cdbe8cdd353a145a70bc4129aa66398cbdb5728a4e064"
		>
			<Support.Trigger className="fixed right-4 bottom-4 z-[9999] flex size-14 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors">
				{(props) => <LandingTriggerContent {...props} />}
			</Support.Trigger>
		</Support>
	);
}
