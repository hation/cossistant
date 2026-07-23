import type { Database } from "@api/db";
import { emailBounceStatus } from "@api/db/schema";
import { and, eq } from "drizzle-orm";

/**
 * Check if an email is suppressed (bounced, complained, or failed repeatedly)
 */
export async function isEmailSuppressed(
	db: Database,
	params: {
		email: string;
		organizationId: string;
	}
): Promise<boolean> {
	const [result] = await db
		.select({
			suppressed: emailBounceStatus.suppressed,
		})
		.from(emailBounceStatus)
		.where(
			and(
				eq(emailBounceStatus.email, params.email),
				eq(emailBounceStatus.organizationId, params.organizationId)
			)
		)
		.limit(1);

	return result?.suppressed ?? false;
}

/**
 * Get email bounce status details
 */
export async function getEmailBounceStatus(
	db: Database,
	params: {
		email: string;
		organizationId: string;
	}
) {
	const [result] = await db
		.select()
		.from(emailBounceStatus)
		.where(
			and(
				eq(emailBounceStatus.email, params.email),
				eq(emailBounceStatus.organizationId, params.organizationId)
			)
		)
		.limit(1);

	return result;
}

/**
 * Record a bounce event from Resend webhook
 */
export async function recordEmailBounce(
	db: Database,
	params: {
		email: string;
		organizationId: string;
		bounceType: string;
		bounceSubType?: string;
		bounceMessage?: string;
		eventId: string;
	}
) {
	const now = new Date();

	// Determine if this should suppress future sends
	// Permanent bounces and suppressed emails should be suppressed
	const shouldSuppress =
		params.bounceType === "Permanent" || params.bounceSubType === "Suppressed";

	await db
		.insert(emailBounceStatus)
		.values({
			email: params.email,
			organizationId: params.organizationId,
			bounceType: params.bounceType,
			bounceSubType: params.bounceSubType ?? null,
			bounceMessage: params.bounceMessage ?? null,
			bouncedAt: now,
			suppressed: shouldSuppress,
			suppressedReason: shouldSuppress ? "bounced" : null,
			suppressedAt: shouldSuppress ? now : null,
			lastEventId: params.eventId,
			updatedAt: now,
		})
		.onConflictDoUpdate({
			target: [emailBounceStatus.email, emailBounceStatus.organizationId],
			set: {
				bounceType: params.bounceType,
				bounceSubType: params.bounceSubType ?? null,
				bounceMessage: params.bounceMessage ?? null,
				bouncedAt: now,
				suppressed: shouldSuppress,
				suppressedReason: shouldSuppress ? "bounced" : null,
				suppressedAt: shouldSuppress ? now : null,
				lastEventId: params.eventId,
				updatedAt: now,
			},
		});

	console.log(
		`[Email Bounce] Recorded bounce for ${params.email} (type: ${params.bounceType}, suppressed: ${shouldSuppress})`
	);
}

/**
 * Record a complaint event from Resend webhook
 */
export async function recordEmailComplaint(
	db: Database,
	params: {
		email: string;
		organizationId: string;
		eventId: string;
	}
) {
	const now = new Date();

	await db
		.insert(emailBounceStatus)
		.values({
			email: params.email,
			organizationId: params.organizationId,
			complainedAt: now,
			suppressed: true,
			suppressedReason: "complained",
			suppressedAt: now,
			lastEventId: params.eventId,
			updatedAt: now,
		})
		.onConflictDoUpdate({
			target: [emailBounceStatus.email, emailBounceStatus.organizationId],
			set: {
				complainedAt: now,
				suppressed: true,
				suppressedReason: "complained",
				suppressedAt: now,
				lastEventId: params.eventId,
				updatedAt: now,
			},
		});

	console.log(
		`[Email Complaint] Recorded complaint for ${params.email}, email suppressed`
	);
}

/**
 * Record a failure event from Resend webhook
 */
export async function recordEmailFailure(
	db: Database,
	params: {
		email: string;
		organizationId: string;
		failureReason: string;
		eventId: string;
	}
) {
	const now = new Date();

	// Get current failure count
	const existing = await getEmailBounceStatus(db, {
		email: params.email,
		organizationId: params.organizationId,
	});

	const currentCount = existing
		? Number.parseInt(existing.failureCount, 10)
		: 0;
	const newCount = currentCount + 1;

	// Suppress after 3 failures
	const shouldSuppress = newCount >= 3;

	await db
		.insert(emailBounceStatus)
		.values({
			email: params.email,
			organizationId: params.organizationId,
			lastFailureReason: params.failureReason,
			failedAt: now,
			failureCount: String(newCount),
			suppressed: shouldSuppress,
			suppressedReason: shouldSuppress ? "failed_repeatedly" : null,
			suppressedAt: shouldSuppress ? now : null,
			lastEventId: params.eventId,
			updatedAt: now,
		})
		.onConflictDoUpdate({
			target: [emailBounceStatus.email, emailBounceStatus.organizationId],
			set: {
				lastFailureReason: params.failureReason,
				failedAt: now,
				failureCount: String(newCount),
				suppressed: shouldSuppress,
				suppressedReason: shouldSuppress ? "failed_repeatedly" : null,
				suppressedAt: shouldSuppress ? now : null,
				lastEventId: params.eventId,
				updatedAt: now,
			},
		});

	console.log(
		`[Email Failure] Recorded failure for ${params.email} (count: ${newCount}, suppressed: ${shouldSuppress})`
	);
}
