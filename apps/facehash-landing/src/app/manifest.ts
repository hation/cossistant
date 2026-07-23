import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
	const icon192 = `/api/avatar?${new URLSearchParams({
		name: "facehash",
		size: "192",
		pose: "front",
	}).toString()}`;
	const icon512 = `/api/avatar?${new URLSearchParams({
		name: "facehash",
		size: "512",
		pose: "front",
	}).toString()}`;

	return {
		name: "Facehash - Beautiful Minimalist Avatars for React",
		short_name: "Facehash",
		description:
			"Beautiful minimalist avatars from any string for React. Zero dependencies, SVG-based depth effects.",
		start_url: "/",
		display: "standalone",
		background_color: "#0a0a0a",
		theme_color: "#0a0a0a",
		icons: [
			{
				src: icon192,
				sizes: "192x192",
				type: "image/png",
				purpose: "maskable",
			},
			{
				src: icon512,
				sizes: "512x512",
				type: "image/png",
				purpose: "maskable",
			},
		],
	};
}
