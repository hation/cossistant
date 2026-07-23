"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { UpgradeModal } from "@/components/plan/upgrade-modal";
import { useWebsite } from "@/contexts/website";
import { useTrainingControls } from "@/hooks/use-training-controls";
import { useTRPC } from "@/lib/trpc/client";

type UseTrainingPageStateOptions = {
	highlightedFeatureKey?: React.ComponentProps<
		typeof UpgradeModal
	>["highlightedFeatureKey"];
};

export function useTrainingPageState({
	highlightedFeatureKey,
}: UseTrainingPageStateOptions) {
	const website = useWebsite();
	const trpc = useTRPC();
	const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

	const { data: aiAgent } = useQuery(
		trpc.aiAgent.get.queryOptions({
			websiteSlug: website.slug,
		})
	);
	const { data: planInfo } = useQuery(
		trpc.plan.getPlanInfo.queryOptions({
			websiteSlug: website.slug,
		})
	);
	const { data: stats } = useQuery(
		trpc.linkSource.getTrainingStats.queryOptions({
			websiteSlug: website.slug,
			aiAgentId: aiAgent?.id ?? null,
		})
	);

	const openUpgradeModal = useCallback(() => {
		setIsUpgradeModalOpen(true);
	}, []);

	const trainingControls = useTrainingControls({
		aiAgentId: aiAgent?.id ?? null,
		onBlocked: openUpgradeModal,
		websiteSlug: website.slug,
	});

	return {
		website,
		websiteSlug: website.slug,
		aiAgent,
		aiAgentId: aiAgent?.id ?? null,
		planInfo,
		stats,
		isFreePlan: planInfo?.plan.name === "free",
		trainingControls,
		openUpgradeModal,
		setIsUpgradeModalOpen,
		upgradeModal:
			planInfo == null ? null : (
				<UpgradeModal
					currentPlan={planInfo.plan}
					highlightedFeatureKey={highlightedFeatureKey}
					initialPlanName="hobby"
					onOpenChange={setIsUpgradeModalOpen}
					open={isUpgradeModalOpen}
					websiteSlug={website.slug}
				/>
			),
	};
}

export type { UseTrainingPageStateOptions };
