import { ConversationTimelineType } from "@cossistant/types";
import type { TimelineItemCreateInput } from "@cossistant/types/api/timeline-item";

function isDate(value: unknown): value is Date {
	return value instanceof Date;
}

type PreparedMessageDefaultTimelineItem = {
	kind: "message";
	input: {
		id?: string;
		text: string;
		extraParts: unknown[];
		visibility: TimelineItemCreateInput["visibility"] | undefined;
		userId: string | null;
		aiAgentId: string | null;
		visitorId: string | null;
		createdAt: Date | undefined;
		tool: string | null;
	};
};

type PreparedGenericDefaultTimelineItem = {
	kind: "timeline";
	input: {
		id?: string;
		type: TimelineItemCreateInput["type"];
		text: string | null;
		parts: NonNullable<TimelineItemCreateInput["parts"]>;
		visibility: TimelineItemCreateInput["visibility"] | undefined;
		userId: string | null;
		aiAgentId: string | null;
		visitorId: string | null;
		createdAt: Date | undefined;
		tool: string | null;
	};
};

export type PreparedDefaultTimelineItem =
	| PreparedMessageDefaultTimelineItem
	| PreparedGenericDefaultTimelineItem;

export function mapDefaultTimelineItemForCreation(
	item: Omit<TimelineItemCreateInput, "createdAt"> & {
		createdAt?: string | Date;
	}
): PreparedDefaultTimelineItem {
	const rawCreatedAt = item.createdAt;
	const createdAt = isDate(rawCreatedAt)
		? rawCreatedAt
		: rawCreatedAt
			? new Date(rawCreatedAt)
			: undefined;
	const normalizedType = item.type ?? ConversationTimelineType.MESSAGE;

	if (normalizedType === ConversationTimelineType.MESSAGE) {
		return {
			kind: "message",
			input: {
				id: item.id,
				text: item.text ?? "",
				extraParts: item.parts?.filter((part) => part.type !== "text") ?? [],
				visibility: item.visibility,
				userId: item.userId ?? null,
				aiAgentId: item.aiAgentId ?? null,
				visitorId: item.visitorId ?? null,
				createdAt,
				tool: item.tool ?? null,
			},
		};
	}

	return {
		kind: "timeline",
		input: {
			id: item.id,
			type: normalizedType,
			text: item.text ?? null,
			parts: item.parts ?? [],
			visibility: item.visibility,
			userId: item.userId ?? null,
			aiAgentId: item.aiAgentId ?? null,
			visitorId: item.visitorId ?? null,
			createdAt,
			tool: item.tool ?? null,
		},
	};
}
