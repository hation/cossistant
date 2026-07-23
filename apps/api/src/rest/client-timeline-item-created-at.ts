export const CLIENT_TIMELINE_ITEM_CREATED_AT_MAX_FUTURE_SKEW_MS = 5 * 60 * 1000;

export class ClientTimelineItemCreatedAtValidationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "ClientTimelineItemCreatedAtValidationError";
	}
}

export function normalizeClientTimelineItemCreatedAt(params: {
	createdAt?: string | Date;
	field: string;
	now?: Date;
}): Date | undefined {
	const { createdAt, field, now = new Date() } = params;

	if (createdAt === undefined) {
		return;
	}

	const normalizedDate =
		createdAt instanceof Date ? createdAt : new Date(createdAt);

	if (Number.isNaN(normalizedDate.getTime())) {
		throw new ClientTimelineItemCreatedAtValidationError(
			`${field} must be a valid RFC 3339 / ISO 8601 timestamp.`
		);
	}

	if (
		normalizedDate.getTime() >
		now.getTime() + CLIENT_TIMELINE_ITEM_CREATED_AT_MAX_FUTURE_SKEW_MS
	) {
		throw new ClientTimelineItemCreatedAtValidationError(
			`${field} cannot be more than 5 minutes in the future.`
		);
	}

	return normalizedDate;
}
