import { describe, expect, it } from "bun:test";
import {
	parseSkillFileContent,
	serializeSkillFileContent,
	stripSkillMarkdownExtension,
} from "../src/skill-file-format";

describe("skill-file-format", () => {
	it("parses valid YAML frontmatter and markdown body", () => {
		const parsed = parseSkillFileContent({
			content: `---
name: pdf-processing
description: Extract text and tables from PDF files.
---

# PDF Processing

Use this skill for PDF operations.`,
			canonicalFileName: "pdf-processing.md",
		});

		expect(parsed.hasFrontmatter).toBe(true);
		expect(parsed.name).toBe("pdf-processing");
		expect(parsed.description).toBe("Extract text and tables from PDF files.");
		expect(parsed.body).toContain("# PDF Processing");
	});

	it("falls back to canonical name and body-derived description for legacy content", () => {
		const parsed = parseSkillFileContent({
			content: "## Refund Policy\n\nCollect the order id before replying.",
			canonicalFileName: "refund-policy.md",
		});

		expect(parsed.hasFrontmatter).toBe(false);
		expect(parsed.name).toBe("refund-policy");
		expect(parsed.description).toBe("Refund Policy");
		expect(parsed.body).toContain("Collect the order id before replying.");
	});

	it("serializes canonical frontmatter with required fields", () => {
		const content = serializeSkillFileContent({
			name: "refund-policy.md",
			description: "Handle refunds and partial refunds.",
			body: "## Workflow\n\n1. Verify order id.",
		});

		expect(content).toContain("name: refund-policy");
		expect(content).toContain(
			"description: Handle refunds and partial refunds."
		);
		expect(content).toContain("## Workflow");
	});

	it("treats malformed frontmatter as legacy markdown content", () => {
		const malformed = `---
name refund-policy
description: malformed
---

## Body`;
		const parsed = parseSkillFileContent({
			content: malformed,
			canonicalFileName: "refund-policy.md",
			fallbackDescription: "Fallback description",
		});

		expect(parsed.hasFrontmatter).toBe(false);
		expect(parsed.name).toBe("refund-policy");
		expect(parsed.description).toBe("Fallback description");
		expect(parsed.body).toBe(malformed);
	});

	it("strips markdown extension for skill frontmatter names", () => {
		expect(stripSkillMarkdownExtension("refund-policy.md")).toBe(
			"refund-policy"
		);
	});
});
