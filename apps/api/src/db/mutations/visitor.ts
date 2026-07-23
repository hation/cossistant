import type { Database } from "@api/db";
import { visitor } from "@api/db/schema";
import type { InferSelectModel } from "drizzle-orm";
import { and, eq } from "drizzle-orm";

export type VisitorRecord = InferSelectModel<typeof visitor>;

export async function blockVisitor(
	db: Database,
	params: { visitor: VisitorRecord; actorUserId: string }
) {
	const blockedAt = new Date().toISOString();

	const [updatedVisitor] = await db
		.update(visitor)
		.set({
			blockedAt,
			blockedByUserId: params.actorUserId,
			updatedAt: blockedAt,
		})
		.where(
			and(
				eq(visitor.id, params.visitor.id),
				eq(visitor.organizationId, params.visitor.organizationId),
				eq(visitor.websiteId, params.visitor.websiteId)
			)
		)
		.returning();

	return updatedVisitor ?? null;
}

export async function unblockVisitor(
	db: Database,
	params: { visitor: VisitorRecord; actorUserId: string }
) {
	const updatedAt = new Date().toISOString();

	const [updatedVisitor] = await db
		.update(visitor)
		.set({
			blockedAt: null,
			blockedByUserId: null,
			updatedAt,
		})
		.where(
			and(
				eq(visitor.id, params.visitor.id),
				eq(visitor.organizationId, params.visitor.organizationId),
				eq(visitor.websiteId, params.visitor.websiteId)
			)
		)
		.returning();

	return updatedVisitor ?? null;
}
