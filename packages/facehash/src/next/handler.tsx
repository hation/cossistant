import { ImageResponse } from "next/og";
import {
	computeFacehash,
	createFacehashScene,
	DEFAULT_COLORS,
	type FacehashPose,
	getColor,
	type Variant,
} from "../core";
import { renderFacehashSceneSvgMarkup } from "../facehash-scene-svg-markup";
import { FacehashImage } from "./image";

// ============================================================================
// Types
// ============================================================================

export type FacehashHandlerOptions = {
	/**
	 * Default image size in pixels.
	 * Can be overridden via `?size=` query param.
	 * @default 400
	 */
	size?: number;

	/**
	 * Default background style.
	 * Can be overridden via `?variant=` query param.
	 * @default "gradient"
	 */
	variant?: Variant;

	/**
	 * Default for showing initial letter.
	 * Can be overridden via `?showInitial=` query param.
	 * @default true
	 */
	showInitial?: boolean;

	/**
	 * Default color palette (hex colors).
	 * Can be overridden via `?colors=` query param (comma-separated).
	 * @default ["#ec4899", "#f59e0b", "#3b82f6", "#f97316", "#10b981"]
	 */
	colors?: string[];

	/**
	 * Cache-Control header value.
	 * Set to `null` to disable caching.
	 * @default "public, max-age=31536000, immutable"
	 */
	cacheControl?: string | null;
};

export type FacehashHandler = {
	GET: (request: Request) => Promise<Response>;
};

type ResponseFormat = "png" | "svg";

// ============================================================================
// Helper Functions
// ============================================================================

const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{3,8}$/;

function parseBoolean(value: string | null, defaultValue: boolean): boolean {
	if (value === null) {
		return defaultValue;
	}
	return value === "true" || value === "1";
}

function parseNumber(
	value: string | null,
	defaultValue: number,
	min = 1,
	max = 2000
): number {
	if (value === null) {
		return defaultValue;
	}
	const num = Number.parseInt(value, 10);
	if (Number.isNaN(num)) {
		return defaultValue;
	}
	return Math.min(Math.max(num, min), max);
}

function parseColors(value: string | null): string[] | undefined {
	if (!value) {
		return;
	}
	const colors = value
		.split(",")
		.map((c) => c.trim())
		.filter((c) => HEX_COLOR_REGEX.test(c));
	return colors.length > 0 ? colors : undefined;
}

function parseVariant(value: string | null): Variant | undefined {
	if (value === "gradient" || value === "solid") {
		return value;
	}
	return;
}

function parseFormat(value: string | null): ResponseFormat | undefined {
	if (value === "png" || value === "svg") {
		return value;
	}
	return;
}

function parsePose(value: string | null): FacehashPose | undefined {
	if (value === "seed" || value === "front") {
		return value;
	}
	return;
}

function sanitizeId(value: string): string {
	return value.replace(/[^a-zA-Z0-9_-]/g, "-");
}

type RenderSvgMarkupOptions = {
	backgroundColor: string;
	name: string;
	scene: ReturnType<typeof createFacehashScene>;
	showInitial: boolean;
	size: number;
	variant: Variant;
};

function renderSvgMarkup(options: RenderSvgMarkupOptions): string {
	const { backgroundColor, name, scene, showInitial, size, variant } = options;

	return renderFacehashSceneSvgMarkup({
		backgroundColor,
		height: size,
		idPrefix: sanitizeId(`facehash-${name}-${size}-${scene.pose}`),
		scene,
		showInitial,
		variant,
		width: size,
	});
}

function buildHeaders(
	contentType: string,
	cacheControl: string | null
): Record<string, string> {
	const headers: Record<string, string> = {
		"Content-Type": contentType,
	};

	if (cacheControl) {
		headers["Cache-Control"] = cacheControl;
	}

	return headers;
}

// ============================================================================
// Main Export
// ============================================================================

/**
 * Creates a Next.js route handler for generating Facehash avatar images.
 *
 * @example
 * ```ts
 * // app/api/avatar/route.ts
 * import { toFacehashHandler } from "facehash/next";
 *
 * export const { GET } = toFacehashHandler();
 * ```
 *
 * @example
 * ```ts
 * // With custom defaults
 * export const { GET } = toFacehashHandler({
 *   size: 200,
 *   variant: "solid",
 *   colors: ["#ff0000", "#00ff00", "#0000ff"],
 * });
 * ```
 *
 * Query parameters:
 * - `name` (required): String to generate avatar from
 * - `size`: Image size in pixels (default: 400)
 * - `variant`: "gradient" or "solid" (default: "gradient")
 * - `showInitial`: "true" or "false" (default: "true")
 * - `colors`: Comma-separated hex colors (e.g., "#ff0000,#00ff00")
 * - `format`: "png" (default) or "svg"
 * - `pose`: "seed" (default) or "front"
 */
export function toFacehashHandler(
	options: FacehashHandlerOptions = {}
): FacehashHandler {
	const {
		size: defaultSize = 400,
		variant: defaultVariant = "gradient",
		showInitial: defaultShowInitial = true,
		colors: defaultColors = [...DEFAULT_COLORS],
		cacheControl = "public, max-age=31536000, immutable",
	} = options;

	async function GET(request: Request): Promise<Response> {
		const url = new URL(request.url);
		const searchParams = url.searchParams;
		const format = parseFormat(searchParams.get("format")) ?? "png";

		// Parse name (required)
		const name = searchParams.get("name");
		if (!name) {
			if (format === "svg") {
				return new Response(
					`<svg xmlns="http://www.w3.org/2000/svg" width="${defaultSize}" height="${defaultSize}" viewBox="0 0 ${defaultSize} ${defaultSize}"><rect width="${defaultSize}" height="${defaultSize}" fill="#f3f4f6"/><text x="50%" y="50%" fill="#6b7280" font-family="sans-serif" font-size="24" text-anchor="middle" dominant-baseline="middle">Missing ?name= parameter</text></svg>`,
					{
						status: 400,
						headers: buildHeaders("image/svg+xml; charset=utf-8", null),
					}
				);
			}

			return new ImageResponse(
				<div
					style={{
						width: "100%",
						height: "100%",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						backgroundColor: "#f3f4f6",
						color: "#6b7280",
						fontSize: 24,
						fontFamily: "sans-serif",
					}}
				>
					Missing ?name= parameter
				</div>,
				{
					width: defaultSize,
					height: defaultSize,
					status: 400,
					headers: buildHeaders("image/png", null),
				}
			);
		}

		// Parse options from query params (override defaults)
		const size = parseNumber(searchParams.get("size"), defaultSize, 16, 2000);
		const variant = parseVariant(searchParams.get("variant")) ?? defaultVariant;
		const showInitial = parseBoolean(
			searchParams.get("showInitial"),
			defaultShowInitial
		);
		const colors = parseColors(searchParams.get("colors")) ?? defaultColors;
		const pose = parsePose(searchParams.get("pose")) ?? "seed";

		// Compute shared scene and background color
		const data = computeFacehash({
			name,
			colorsLength: colors.length,
		});
		const scene = createFacehashScene({
			name,
			colorsLength: colors.length,
			pose,
		});

		const backgroundColor = getColor(colors, data.colorIndex);
		if (format === "svg") {
			return new Response(
				renderSvgMarkup({
					backgroundColor,
					name,
					scene,
					showInitial,
					size,
					variant,
				}),
				{
					headers: buildHeaders("image/svg+xml; charset=utf-8", cacheControl),
				}
			);
		}

		return new ImageResponse(
			<FacehashImage
				backgroundColor={backgroundColor}
				scene={scene}
				showInitial={showInitial}
				size={size}
				variant={variant}
			/>,
			{
				width: size,
				height: size,
				headers: buildHeaders("image/png", cacheControl),
			}
		);
	}

	return { GET };
}
