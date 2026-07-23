import type { Database } from "@api/db";
import { contact, contactRelations, visitor } from "@api/db/schema";
import { generateULID } from "@api/utils/db/ids";
import { and, eq, inArray, isNull } from "drizzle-orm";

export type VisitorRecord = typeof visitor.$inferSelect;
type VisitorInsert = typeof visitor.$inferInsert;

export async function upsertVisitor(
	db: Database,
	params: {
		websiteId: string;
		organizationId: string;
		visitorId: string;
		isTest?: boolean;
		visitorData?: {
			browser?: string | null;
			browserVersion?: string | null;
			os?: string | null;
			osVersion?: string | null;
			device?: string | null;
			deviceType?: string | null;
			language?: string | null;
			timezone?: string | null;
			screenResolution?: string | null;
			viewport?: string | null;
			ip?: string | null;
			city?: string | null;
			region?: string | null;
			country?: string | null;
			countryCode?: string | null;
			latitude?: number | null;
			longitude?: number | null;
		};
	}
) {
	const now = new Date().toISOString();

	// Base values for insert/update
	const baseValues = {
		id: params.visitorId,
		websiteId: params.websiteId,
		organizationId: params.organizationId,
		isTest: params.isTest ?? false,
		lastSeenAt: now,
		updatedAt: now,
		...(params.visitorData && {
			browser: params.visitorData.browser,
			browserVersion: params.visitorData.browserVersion,
			os: params.visitorData.os,
			osVersion: params.visitorData.osVersion,
			device: params.visitorData.device,
			deviceType: params.visitorData.deviceType,
			language: params.visitorData.language,
			timezone: params.visitorData.timezone,
			screenResolution: params.visitorData.screenResolution,
			viewport: params.visitorData.viewport,
			ip: params.visitorData.ip,
			city: params.visitorData.city,
			region: params.visitorData.region,
			country: params.visitorData.country,
			countryCode: params.visitorData.countryCode,
			latitude: params.visitorData.latitude,
			longitude: params.visitorData.longitude,
		}),
	};

	// Update values - same as base but without id, websiteId, organizationId
	const updateValues = {
		lastSeenAt: now,
		updatedAt: now,
		...(params.visitorData && {
			browser: params.visitorData.browser,
			browserVersion: params.visitorData.browserVersion,
			os: params.visitorData.os,
			osVersion: params.visitorData.osVersion,
			device: params.visitorData.device,
			deviceType: params.visitorData.deviceType,
			language: params.visitorData.language,
			timezone: params.visitorData.timezone,
			screenResolution: params.visitorData.screenResolution,
			viewport: params.visitorData.viewport,
			ip: params.visitorData.ip,
			city: params.visitorData.city,
			region: params.visitorData.region,
			country: params.visitorData.country,
			countryCode: params.visitorData.countryCode,
			latitude: params.visitorData.latitude,
			longitude: params.visitorData.longitude,
		}),
	};

	// return the visitor record with associated contact
	const [newVisitor] = await db
		.insert(visitor)
		.values(baseValues)
		.onConflictDoUpdate({
			target: visitor.id,
			set: updateValues,
		})
		.returning();

	return newVisitor;
}

export async function getVisitor(
	db: Database,
	params: {
		visitorId?: string | null;
	}
) {
	if (!params.visitorId) {
		return;
	}

	const _visitor = await db.query.visitor
		.findFirst({
			where: eq(visitor.id, params.visitorId),
		})
		.execute();

	return _visitor;
}

export async function getCompleteVisitorWithContact(
	db: Database,
	params: {
		visitorId: string;
	}
) {
	const _visitor = await db.query.visitor.findFirst({
		where: eq(visitor.id, params.visitorId),
		with: {
			contact: true,
		},
	});

	return _visitor;
}

export async function findVisitorForWebsite(
	db: Database,
	params: {
		visitorId: string;
		websiteId: string;
	}
): Promise<VisitorRecord | null> {
	const [record] = await db
		.select()
		.from(visitor)
		.where(
			and(
				eq(visitor.id, params.visitorId),
				eq(visitor.websiteId, params.websiteId)
			)
		)
		.limit(1);

	return record ?? null;
}

export async function updateVisitorForWebsite(
	db: Database,
	params: {
		visitorId: string;
		websiteId: string;
		data: Partial<VisitorInsert>;
	}
): Promise<VisitorRecord | null> {
	const [updated] = await db
		.update(visitor)
		.set(params.data)
		.where(
			and(
				eq(visitor.id, params.visitorId),
				eq(visitor.websiteId, params.websiteId)
			)
		)
		.returning();

	return updated ?? null;
}

export type VisitorPresenceProfile = {
	id: string;
	lastSeenAt: string | null;
	city: string | null;
	region: string | null;
	country: string | null;
	latitude: number | null;
	longitude: number | null;
	contactId: string | null;
	contactName: string | null;
	contactEmail: string | null;
	contactImage: string | null;
};

const MAX_VISITOR_PRESENCE_IDS = 500;

export async function getVisitorPresenceProfiles(
	db: Database,
	params: {
		websiteId: string;
		visitorIds: string[];
	}
): Promise<VisitorPresenceProfile[]> {
	const dedupedVisitorIds = Array.from(new Set(params.visitorIds)).slice(
		0,
		MAX_VISITOR_PRESENCE_IDS
	);

	if (dedupedVisitorIds.length === 0) {
		return [];
	}

	const rows = await db
		.select({
			id: visitor.id,
			lastSeenAt: visitor.lastSeenAt,
			city: visitor.city,
			region: visitor.region,
			country: visitor.country,
			latitude: visitor.latitude,
			longitude: visitor.longitude,
			contactId: visitor.contactId,
			contactName: contact.name,
			contactEmail: contact.email,
			contactImage: contact.image,
		})
		.from(visitor)
		.leftJoin(contact, eq(visitor.contactId, contact.id))
		.where(
			and(
				eq(visitor.websiteId, params.websiteId),
				inArray(visitor.id, dedupedVisitorIds),
				isNull(visitor.deletedAt)
			)
		);

	return rows;
}
