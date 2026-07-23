import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_URL || "https://facehash.dev";

export default function robots(): MetadataRoute.Robots {
	return {
		rules: [
			{
				userAgent: "*",
				allow: "/",
				disallow: ["/og-image-generate"],
			},
		],
		sitemap: `${siteUrl}/sitemap.xml`,
	};
}
