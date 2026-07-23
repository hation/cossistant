import { defineConfig } from "tsdown";

export default defineConfig({
	entry: ["src/**/*.{ts,tsx}"],
	platform: "browser",
	sourcemap: true,
	minify: false,
	treeshake: true,
	dts: true,
	// external: [
	//   // React ecosystem (peer dependencies)
	//   "react",
	//   "react-dom",
	//   "react/jsx-runtime",

	//   // Peer dependencies
	//   "@tanstack/react-query",
	//   "motion",
	//   "motion/*",
	//   "tailwindcss",

	//   // Internal workspace packages that should be bundled
	//   // Remove "@cossistant/*" to bundle core and types
	//   "@cossistant/core",
	//   "@cossistant/types",

	//   // Regular dependencies that should stay external
	//   "react-use-websocket",
	//   "react-markdown",
	//   "zustand",
	//   "zustand/middleware",
	//   "nanoid",
	//   "ulid",
	//   "tailwind-merge",
	// ],
});
