import { TrainingSummarySidebar } from "@/components/ui/layout/sidebars/training-summary";
import { prefetchTrainingShell } from "./_lib/prefetch";

type TrainingLayoutProps = {
	children: React.ReactNode;
	params: Promise<{
		websiteSlug: string;
	}>;
};

export default async function TrainingLayout({
	children,
	params,
}: TrainingLayoutProps) {
	const { websiteSlug } = await params;
	const { aiAgentId } = await prefetchTrainingShell(websiteSlug);

	return (
		<>
			{children}
			<TrainingSummarySidebar aiAgentId={aiAgentId} />
		</>
	);
}
