import type { ActivityIcon } from "../activity-wrapper";
import { ActivityWrapper } from "../activity-wrapper";
import type { EventActivityProps } from "../types";

export function VisitorIdentifiedActivity({
	event,
	timestamp,
	showIcon = true,
	showActorName = true,
	showTerminalIndicator = false,
}: EventActivityProps) {
	const icon: ActivityIcon = {
		type: "avatar",
		name: event.actorName,
		image: event.actorImage,
	};

	const text = showActorName ? (
		<>
			<span className="font-semibold">{event.actorName}</span> identified, new
			contact created
		</>
	) : (
		"identified, new contact created"
	);

	return (
		<ActivityWrapper
			icon={icon}
			showIcon={showIcon}
			showTerminalIndicator={showTerminalIndicator}
			state="result"
			text={text}
			timestamp={timestamp}
		/>
	);
}
