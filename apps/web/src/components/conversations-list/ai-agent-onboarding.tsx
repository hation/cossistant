import Link from "next/link";
import { Button } from "../ui/button";
import Icon from "../ui/icons";
import { Logo } from "../ui/logo";

type AIAgentOnboardingProps = {
	websiteSlug: string;
};

export function AIAgentOnboarding({ websiteSlug }: AIAgentOnboardingProps) {
	return (
		<div className="flex max-w-sm flex-col gap-3 rounded border border-primary/30 border-dashed p-6">
			<p className="text-primary text-sm">
				Create your AI agent to handle conversations automatically while you
				sleep.
			</p>
			<Button asChild className="mt-6 ml-auto w-fit">
				<Link href={`/${websiteSlug}/agent/create`}>Create AI Agent now</Link>
			</Button>
		</div>
	);
}
