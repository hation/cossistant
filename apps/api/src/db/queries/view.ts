import { generateULID } from "@api/utils/db/ids";
import { and, eq, isNotNull, isNull } from "drizzle-orm/sql";
import type { Database } from "..";
import { type ViewInsert, view } from "../schema";

export async function listActiveWebsiteViews(
	db: Database,
	params: {
		websiteId: string;
	}
) {
	const views = await db
		.select()
		.from(view)
		.where(and(eq(view.websiteId, params.websiteId), isNull(view.deletedAt)));

	return views;
}

export async function listArchivedWebsiteViews(
	db: Database,
	params: {
		websiteId: string;
	}
) {
	const views = await db
		.select()
		.from(view)
		.where(
			and(eq(view.websiteId, params.websiteId), isNotNull(view.deletedAt))
		);

	return views;
}

export async function createDefaultWebsiteViews(
	db: Database,
	data: {
		websiteId: string;
		websiteName: string;
		organizationId: string;
		createdBy: string;
	}
) {
	// Generate production / test private and public keys
	const views: ViewInsert[] = [
		{
			id: generateULID(),
			organizationId: data.organizationId,
			websiteId: data.websiteId,
			name: "bugs",
			description: "Conversations reporting broken behavior.",
			prompt: `Select this view if the main issue is: something that should work doesn’t.
Do: attach when you see errors/exceptions, failed requests, wrong results, data loss, regressions (“used to work”), broken UI/API/permissions.
Don’t: attach for how-to questions, requests for new abilities, or anything about price/plan.
If uncertain: ask one clarifying question to confirm defect vs request; attach only if confidence ≥ 0.7, else skip.`,
		},
		{
			id: generateULID(),
			organizationId: data.organizationId,
			websiteId: data.websiteId,
			name: "features",
			description: "Conversations asking for new or changed behavior.",
			prompt: `Select this view if they want the product to do something it can’t yet, or to work differently.
Do: attach on “can you add…”, integration/support requests, customization, “is this planned?”, comparisons to competitors.
Don’t: attach if an existing feature is failing (that’s a bug) or the topic is payment/plan/invoices/refunds (billing).
If uncertain: restate their goal and ask one focused question; attach only if confidence ≥ 0.7, else skip.`,
		},
		{
			id: generateULID(),
			organizationId: data.organizationId,
			websiteId: data.websiteId,
			name: "billing",
			description:
				"Conversations about money or plans: payments, invoices/tax, refunds, upgrades/downgrades, cancellations, trials, renewals, pricing.",
			prompt: `Select this view if the outcome they want is financial or plan access.
Do: attach on failed payments, invoice/receipt/VAT questions, refunds/disputes, plan/seat changes, upgrades/downgrades, cancellations/pauses, trial/renewal, pricing.
Don’t: attach if the core issue is a broken feature (bug) or a request for a new ability (feature).
If uncertain: check whether the desired outcome is about money or plan; attach only if confidence ≥ 0.7, else skip.`,
		},
	];

	const result = await db.insert(view).values(views).returning();

	return result;
}
