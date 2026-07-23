/**
 * Next.js adapter for Facehash image generation.
 *
 * @example
 * ```ts
 * // app/api/avatar/route.ts
 * import { toFacehashHandler } from "facehash/next";
 *
 * export const { GET } = toFacehashHandler();
 * ```
 *
 * @packageDocumentation
 */

// Re-export core types for convenience
export {
	DEFAULT_COLORS,
	type FacehashData,
	type FaceType,
	type Variant,
} from "../core";
export {
	type FacehashHandler,
	type FacehashHandlerOptions,
	toFacehashHandler,
} from "./handler";
