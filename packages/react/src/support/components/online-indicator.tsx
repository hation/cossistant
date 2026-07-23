import type { ReactElement } from "react";
import { cn } from "../utils";

/**
 * Threshold in milliseconds for considering an agent as "online".
 * Default: 15 minutes (900,000ms)
 */
const ONLINE_THRESHOLD_MS = 15 * 60 * 1000;

/**
 * Threshold in milliseconds for considering an agent as "away".
 * Default: 1 hour (3,600,000ms)
 */
const AWAY_THRESHOLD_MS = 60 * 60 * 1000;

export type AgentStatus = "online" | "away" | "offline";

/**
 * Determines an agent's status based on their lastSeenAt timestamp.
 * - Online: seen within the last 15 minutes
 * - Away: seen within the last hour
 * - Offline: not seen in the last hour or no timestamp
 */
export function getAgentStatus(
	lastSeenAt: string | null | undefined
): AgentStatus {
	if (!lastSeenAt) {
		return "offline";
	}

	const lastSeen = new Date(lastSeenAt);
	const now = Date.now();
	const onlineThreshold = new Date(now - ONLINE_THRESHOLD_MS);
	const awayThreshold = new Date(now - AWAY_THRESHOLD_MS);

	if (lastSeen > onlineThreshold) {
		return "online";
	}

	if (lastSeen > awayThreshold) {
		return "away";
	}

	return "offline";
}

/**
 * @deprecated Use getAgentStatus instead for more granular status.
 * Determines if an agent is online based on their lastSeenAt timestamp.
 * An agent is considered online if they were seen within the last 15 minutes.
 */
export function isAgentOnline(lastSeenAt: string | null | undefined): boolean {
	return getAgentStatus(lastSeenAt) === "online";
}

type OnlineIndicatorProps = {
	/**
	 * The agent's current status.
	 * - "online": green dot
	 * - "away": orange dot
	 * - "offline": nothing rendered
	 */
	status: AgentStatus;
	/**
	 * Size of the indicator dot in pixels.
	 * @default 6
	 */
	size?: number;
	/**
	 * Additional class names for positioning.
	 */
	className?: string;
};

const STATUS_COLORS: Record<AgentStatus, string> = {
	online: "bg-co-success",
	away: "bg-co-warning",
	offline: "",
};

/**
 * A small dot indicator showing agent status.
 * - Green for online (active in last 15 minutes)
 * - Orange for away (active in last hour)
 * Features a transparent outline that adapts to any background using
 * the theme's background color via box-shadow.
 */
export function OnlineIndicator({
	status,
	size = 6,
	className,
}: OnlineIndicatorProps): ReactElement | null {
	if (status === "offline") {
		return null;
	}

	return (
		<span
			aria-hidden="true"
			className={cn(
				"absolute block rounded-full ring-2 ring-co-background",
				STATUS_COLORS[status],
				className
			)}
			style={{
				width: `${size}px`,
				height: `${size}px`,
			}}
		/>
	);
}
