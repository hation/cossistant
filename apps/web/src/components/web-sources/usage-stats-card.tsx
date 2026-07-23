"use client";

import type { RouterOutputs } from "@api/trpc/types";
import { UsageBar } from "@/components/plan/usage-bar";
import { Skeleton } from "@/components/ui/skeleton";
import { formatBytes } from "./utils";

type TrainingStats = RouterOutputs["linkSource"]["getTrainingStats"];

type UsageStatsCardProps = {
	stats: TrainingStats | undefined;
	isLoading?: boolean;
};

export function UsageStatsCard({
	stats,
	isLoading = false,
}: UsageStatsCardProps) {
	if (isLoading) {
		return (
			<div className="flex flex-col gap-4">
				<div className="space-y-4">
					<Skeleton className="h-8 w-full" />
					<Skeleton className="h-8 w-full" />
					<Skeleton className="h-16 w-full" />
				</div>
			</div>
		);
	}

	if (!stats) {
		return null;
	}

	return (
		<div className="flex flex-col gap-4">
			<div className="space-y-4">
				<UsageBar
					current={stats.linkSourcesCount}
					label="Link Sources"
					limit={stats.planLimitLinks}
				/>
				<UsageBar
					current={stats.urlKnowledgeCount}
					label="Total Pages"
					limit={stats.totalPagesLimit}
				/>
				<UsageBar
					current={stats.totalSizeBytes}
					formatValue={(current, limit) =>
						limit === null
							? `${formatBytes(current)} / Unlimited`
							: `${formatBytes(current)} / ${formatBytes(limit)}`
					}
					label="Knowledge Base Size"
					limit={stats.planLimitBytes}
				/>
			</div>
		</div>
	);
}

export type { UsageStatsCardProps };
