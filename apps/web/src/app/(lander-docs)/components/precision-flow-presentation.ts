import { PlayIcon, RotateCcwIcon } from "lucide-react";

export function getPrecisionFlowPrimaryActionPresentation(params: {
	isManuallyPaused: boolean;
	replayCountdownSeconds: number | null;
}) {
	if (params.isManuallyPaused) {
		return {
			label: "Resume",
			icon: PlayIcon,
			variant: "default" as const,
		};
	}

	return {
		label:
			params.replayCountdownSeconds !== null
				? `Replay in ${params.replayCountdownSeconds}s`
				: "Replay flow",
		icon: RotateCcwIcon,
		variant: "outline" as const,
	};
}

export function getPrecisionFlowReplayButtonLabel(params: {
	isManuallyPaused: boolean;
	replayCountdownSeconds: number | null;
}) {
	return getPrecisionFlowPrimaryActionPresentation(params).label;
}
