declare module "@bull-board/api" {
	export * from "@bull-board/api/dist/index.js";
}

declare module "@bull-board/api/bullMQAdapter" {
	export { BullMQAdapter } from "@bull-board/api/dist/queueAdapters/bullMQ.js";
}

declare module "@bull-board/hono" {
	export * from "@bull-board/hono/dist/index.js";
}
