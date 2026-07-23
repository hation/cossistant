"use server";

import { and, db, eq, isNull } from "@api/db";
import { website } from "@api/db/schema";
import { auth } from "@api/lib/auth";
import { cookies, headers } from "next/headers";
import { SELECTED_WEBSITE_COOKIE_NAME } from "@/constants";

export async function switchWebsite(websiteId: string): Promise<string> {
	// Verify the website exists and is not deleted
	const [selectedWebsite] = await db
		.select({
			id: website.id,
			slug: website.slug,
			organizationId: website.organizationId,
		})
		.from(website)
		.where(and(eq(website.id, websiteId), isNull(website.deletedAt)))
		.limit(1);

	if (!selectedWebsite) {
		throw new Error("Website not found");
	}

	// Set the active organization in the session
	const headersList = await headers();
	try {
		await auth.api.setActiveOrganization({
			headers: headersList,
			body: {
				organizationId: selectedWebsite.organizationId,
			},
		});
	} catch (error) {
		console.error("Failed to set active organization:", error);
		// Continue even if this fails - not critical
	}

	// Set the cookie
	const cookieStore = await cookies();
	cookieStore.set(SELECTED_WEBSITE_COOKIE_NAME, websiteId, {
		path: "/",
		httpOnly: true,
		sameSite: "lax",
		// Cookie expires in 1 year
		maxAge: 60 * 60 * 24 * 365,
	});

	return selectedWebsite.slug;
}
