export type FeaturedOpenSourceProject = {
	id: string;
	name: string;
	websiteUrl: string;
	ogImageUrl: string;
};

export const FEATURED_OPEN_SOURCE_PROJECTS: FeaturedOpenSourceProject[] = [
	{
		id: "facehash",
		name: "Facehash",
		websiteUrl: "https://facehash.dev",
		ogImageUrl: "https://facehash.dev/og-image.png",
	},
	{
		id: "databuddy",
		name: "Databuddy",
		websiteUrl: "https://databuddy.cc",
		ogImageUrl: "https://databuddy.cc/og-image.png",
	},
	{
		id: "kanadojo",
		name: "KanaDojo",
		websiteUrl: "https://kanadojo.com",
		ogImageUrl:
			"https://kanadojo.com/api/og?title=KanaDojo%20-%20Learn%20Japanese%20Online&description=Master%20Japanese%20with%20KanaDojo%20-%20a%20fun%2C%20aesthetic%2C%20minimalist%20platform%20for%20learning%20Hiragana%2C%20Katakan&type=default",
	},
];
