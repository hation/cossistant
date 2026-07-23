import type { FacehashScene, Variant } from "./core";

type RenderFacehashSceneSvgMarkupOptions = {
	backgroundColor: string;
	height: number | string;
	idPrefix: string;
	scene: FacehashScene;
	showInitial: boolean;
	variant: Variant;
	width: number | string;
};

function sanitizeId(value: string): string {
	return value.replace(/[^a-zA-Z0-9_-]/g, "-");
}

function escapeAttribute(value: string): string {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll('"', "&quot;")
		.replaceAll("<", "&lt;");
}

function escapeText(value: string): string {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;");
}

function renderPaths(paths: string[]): string {
	return paths
		.map(
			(path) => `<path d="${escapeAttribute(path)}" fill="currentColor"></path>`
		)
		.join("");
}

function stringifyLength(value: number | string): string {
	return escapeAttribute(String(value));
}

export function renderFacehashSceneSvgMarkup(
	options: RenderFacehashSceneSvgMarkupOptions
): string {
	const {
		backgroundColor,
		height,
		idPrefix,
		scene,
		showInitial,
		variant,
		width,
	} = options;
	const gradientId = `${sanitizeId(idPrefix)}-gradient`;
	const faceScaleX = scene.faceBox.width / scene.faceGeometry.viewBox.width;
	const faceScaleY = scene.faceBox.height / scene.faceGeometry.viewBox.height;

	return [
		`<svg aria-hidden="true" fill="none" height="${stringifyLength(height)}" style="display:block;overflow:visible" viewBox="0 0 100 100" width="${stringifyLength(width)}" xmlns="http://www.w3.org/2000/svg">`,
		"<defs>",
		`<radialGradient cx="${scene.gradientCenter.x}%" cy="${scene.gradientCenter.y}%" id="${escapeAttribute(gradientId)}" r="70%">`,
		'<stop offset="0%" stop-color="#ffffff" stop-opacity="0.15"></stop>',
		'<stop offset="60%" stop-color="#ffffff" stop-opacity="0"></stop>',
		"</radialGradient>",
		"</defs>",
		`<rect fill="${escapeAttribute(backgroundColor)}" height="100" width="100" x="0" y="0"></rect>`,
		variant === "gradient"
			? `<rect fill="url(#${escapeAttribute(gradientId)})" height="100" width="100" x="0" y="0"></rect>`
			: "",
		`<g transform="${escapeAttribute(scene.projection.svgTransform)}">`,
		`<g transform="translate(${scene.faceBox.x} ${scene.faceBox.y}) scale(${faceScaleX} ${faceScaleY})">`,
		"<g>",
		renderPaths(scene.faceGeometry.leftEyePaths),
		"</g>",
		"<g>",
		renderPaths(scene.faceGeometry.rightEyePaths),
		"</g>",
		"</g>",
		showInitial
			? `<text dominant-baseline="middle" fill="currentColor" font-family="monospace" font-size="${scene.initialLayout.fontSize}" font-weight="700" text-anchor="middle" x="${scene.initialLayout.x}" y="${scene.initialLayout.y}">${escapeText(scene.data.initial)}</text>`
			: "",
		"</g>",
		"</svg>",
	].join("");
}
