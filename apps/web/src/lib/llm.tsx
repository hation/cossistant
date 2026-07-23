import type { InferPageType } from "fumadocs-core/source";
import type { source } from "@/lib/source";

type PageData = {
	type?: string;
	title?: string;
	getText?: (mode: string) => Promise<string>;
};

const isPageData = (data: unknown): data is PageData => {
	if (typeof data !== "object" || data === null) {
		return false;
	}
	const obj = data as Record<string, unknown>;
	return (
		(obj.type === undefined || typeof obj.type === "string") &&
		(obj.title === undefined || typeof obj.title === "string") &&
		(obj.getText === undefined || typeof obj.getText === "function")
	);
};

export const getLLMText = async (page: InferPageType<typeof source>) => {
	const data: unknown = page.data;

	if (!isPageData(data)) {
		return "";
	}

	if (data.type === "openapi") {
		return "";
	}

	let processed = "";
	if (data.getText) {
		try {
			processed = await data.getText("processed");
		} catch (error) {
			console.error("Failed to get processed text for LLM:", error);
			processed = "";
		}
	}

	return `# ${data.title ?? ""}
URL: ${page.url}
${processed}`;
};
