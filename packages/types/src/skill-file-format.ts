const FRONTMATTER_DELIMITER = "---";
const MARKDOWN_EXTENSION_REGEX = /\.md$/i;
const DEFAULT_DESCRIPTION = "Skill instructions";

export type ParseSkillFileContentInput = {
	content: string;
	canonicalFileName: string;
	fallbackDescription?: string;
};

export type ParsedSkillFileContent = {
	name: string;
	description: string;
	body: string;
	hasFrontmatter: boolean;
};

export type SerializeSkillFileContentInput = {
	name: string;
	description: string;
	body: string;
};

function normalizeNewlines(value: string): string {
	return value.replace(/\r\n/g, "\n");
}

function trimYamlScalar(value: string): string {
	const trimmed = value.trim();

	if (
		(trimmed.startsWith('"') && trimmed.endsWith('"')) ||
		(trimmed.startsWith("'") && trimmed.endsWith("'"))
	) {
		return trimmed.slice(1, -1).trim();
	}

	return trimmed;
}

function normalizeSkillDescription(value: string): string {
	return value.replace(/\s+/g, " ").trim();
}

function splitFrontmatter(content: string): {
	frontmatterLines: string[];
	body: string;
	hasFrontmatter: boolean;
} {
	if (!content.startsWith(`${FRONTMATTER_DELIMITER}\n`)) {
		return { frontmatterLines: [], body: content, hasFrontmatter: false };
	}

	const lines = content.split("\n");
	if (lines[0]?.trim() !== FRONTMATTER_DELIMITER) {
		return { frontmatterLines: [], body: content, hasFrontmatter: false };
	}

	let closingDelimiterIndex = -1;
	for (let index = 1; index < lines.length; index += 1) {
		if (lines[index]?.trim() === FRONTMATTER_DELIMITER) {
			closingDelimiterIndex = index;
			break;
		}
	}

	if (closingDelimiterIndex === -1) {
		return { frontmatterLines: [], body: content, hasFrontmatter: false };
	}

	const frontmatterLines = lines.slice(1, closingDelimiterIndex);
	const body = lines.slice(closingDelimiterIndex + 1).join("\n");

	return { frontmatterLines, body, hasFrontmatter: true };
}

function parseFrontmatterLines(frontmatterLines: string[]): {
	name?: string;
	description?: string;
} | null {
	let name: string | undefined;
	let description: string | undefined;

	for (const line of frontmatterLines) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) {
			continue;
		}

		const separatorIndex = trimmed.indexOf(":");
		if (separatorIndex === -1) {
			return null;
		}

		const key = trimmed.slice(0, separatorIndex).trim();
		const value = trimYamlScalar(trimmed.slice(separatorIndex + 1));

		if (key === "name") {
			name = value;
		}

		if (key === "description") {
			description = value;
		}
	}

	return { name, description };
}

export function stripSkillMarkdownExtension(value: string): string {
	return value.trim().replace(MARKDOWN_EXTENSION_REGEX, "");
}

export function deriveSkillDescriptionFromBody(body: string): string {
	const lines = normalizeNewlines(body)
		.split("\n")
		.map((line) => line.trim())
		.filter(Boolean);

	const firstLine =
		lines.find(
			(line) =>
				line !== FRONTMATTER_DELIMITER && !/^(name|description)\s*:/i.test(line)
		) ?? "";
	if (!firstLine) {
		return "";
	}

	const normalized = firstLine
		.replace(/^#{1,6}\s+/, "")
		.replace(/^[-*+]\s+/, "")
		.replace(/^\d+\.\s+/, "")
		.replace(/\s+/g, " ")
		.trim();

	if (!normalized) {
		return "";
	}

	if (normalized.length <= 160) {
		return normalized;
	}

	return `${normalized.slice(0, 157)}...`;
}

export function parseSkillFileContent(
	input: ParseSkillFileContentInput
): ParsedSkillFileContent {
	const canonicalName = stripSkillMarkdownExtension(input.canonicalFileName);
	const normalizedContent = normalizeNewlines(input.content);
	const splitResult = splitFrontmatter(normalizedContent);

	if (splitResult.hasFrontmatter) {
		const parsedFrontmatter = parseFrontmatterLines(
			splitResult.frontmatterLines
		);
		if (parsedFrontmatter) {
			const body = splitResult.body.replace(/^\n+/, "");
			const description =
				normalizeSkillDescription(parsedFrontmatter.description ?? "") ||
				normalizeSkillDescription(input.fallbackDescription ?? "") ||
				normalizeSkillDescription(deriveSkillDescriptionFromBody(body)) ||
				DEFAULT_DESCRIPTION;

			return {
				name: stripSkillMarkdownExtension(
					parsedFrontmatter.name ?? canonicalName
				),
				description,
				body,
				hasFrontmatter: true,
			};
		}
	}

	const description =
		normalizeSkillDescription(input.fallbackDescription ?? "") ||
		normalizeSkillDescription(
			deriveSkillDescriptionFromBody(normalizedContent)
		) ||
		DEFAULT_DESCRIPTION;

	return {
		name: canonicalName,
		description,
		body: normalizedContent,
		hasFrontmatter: false,
	};
}

export function serializeSkillFileContent(
	input: SerializeSkillFileContentInput
): string {
	const name = stripSkillMarkdownExtension(input.name);
	const description =
		normalizeSkillDescription(input.description) || DEFAULT_DESCRIPTION;
	const body = normalizeNewlines(input.body).replace(/^\n+/, "").trimEnd();

	if (!body) {
		return [
			FRONTMATTER_DELIMITER,
			`name: ${name}`,
			`description: ${description}`,
			FRONTMATTER_DELIMITER,
		].join("\n");
	}

	return [
		FRONTMATTER_DELIMITER,
		`name: ${name}`,
		`description: ${description}`,
		FRONTMATTER_DELIMITER,
		"",
		body,
	].join("\n");
}
