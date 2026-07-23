import type React from "react";
import type { EventActivityProps } from "../types";
import { AssignedActivity } from "./assigned";
import { ParticipantJoinedActivity } from "./participant-joined";
import { ParticipantLeftActivity } from "./participant-left";
import { ParticipantRequestedActivity } from "./participant-requested";
import { PriorityChangedActivity } from "./priority-changed";
import { ReopenedActivity } from "./reopened";
import { ResolvedActivity } from "./resolved";
import { StatusChangedActivity } from "./status-changed";
import { VisitorIdentifiedActivity } from "./visitor-identified";

export { FallbackEventActivity } from "./fallback-event";

export const EVENT_RENDERER_MAP: Record<
	string,
	React.ComponentType<EventActivityProps>
> = {
	assigned: AssignedActivity,
	unassigned: AssignedActivity,
	participant_requested: ParticipantRequestedActivity,
	participant_joined: ParticipantJoinedActivity,
	participant_left: ParticipantLeftActivity,
	status_changed: StatusChangedActivity,
	priority_changed: PriorityChangedActivity,
	resolved: ResolvedActivity,
	reopened: ReopenedActivity,
	visitor_identified: VisitorIdentifiedActivity,
};
