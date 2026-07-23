export type ImmediateClarificationIntentDetail = {
	text: string;
	source: "questionContext" | "triggerText";
};

const GENERIC_INTENT_PATTERNS = [
	/^(?:hi|hello|hey)(?: there)?[.!?]*$/i,
	/^(?:thanks|thank you|thx)[.!?]*$/i,
	/^(?:ok|okay|got it|understood|sounds good|noted)[.!?]*$/i,
	/^(?:any )?update[s]?[.!?]*$/i,
	/^(?:status|checking in|just checking in|follow(?:ing)? up|follow-up|ping|bump)[.!?]*$/i,
	/^(?:help|need help|i need help|please help|can you help(?: me)?)[.!?]*$/i,
	/^(?:question|issue|problem)[.!?]*$/i,
];

const INTENT_CUE_WORDS = new Set([
	"after",
	"are",
	"before",
	"can",
	"can't",
	"cannot",
	"could",
	"did",
	"do",
	"does",
	"during",
	"for",
	"how",
	"i",
	"if",
	"is",
	"me",
	"my",
	"need",
	"our",
	"please",
	"should",
	"their",
	"they",
	"trying",
	"unable",
	"want",
	"what",
	"when",
	"where",
	"while",
	"why",
	"you",
	"your",
]);

function normalizeText(value: string | null | undefined): string | null {
	if (typeof value !== "string") {
		return null;
	}

	const normalized = value.replace(/\s+/g, " ").trim();
	return normalized.length > 0 ? normalized : null;
}

function tokenizeText(value: string): string[] {
	return value
		.toLowerCase()
		.split(/\s+/)
		.map((token) => token.replace(/^[^a-z0-9]+|[^a-z0-9]+$/gi, ""))
		.filter(Boolean);
}

export function isSufficientKnowledgeGapIntentText(
	value: string | null | undefined
): boolean {
	const normalized = normalizeText(value);
	if (!(normalized && normalized.length >= 12)) {
		return false;
	}

	if (GENERIC_INTENT_PATTERNS.some((pattern) => pattern.test(normalized))) {
		return false;
	}

	const words = tokenizeText(normalized);
	if (words.length >= 5) {
		return true;
	}

	if (words.length < 3) {
		return false;
	}

	const hasCueWord = words.some((word) => INTENT_CUE_WORDS.has(word));
	const hasSentencePunctuation = /[?!:;,.]/.test(normalized);

	return hasCueWord || hasSentencePunctuation;
}

export function resolveImmediateClarificationIntentDetail(params: {
	questionContext?: string | null;
	triggerText?: string | null;
}): ImmediateClarificationIntentDetail | null {
	const normalizedQuestionContext = normalizeText(params.questionContext);
	if (isSufficientKnowledgeGapIntentText(normalizedQuestionContext)) {
		return {
			text: normalizedQuestionContext as string,
			source: "questionContext",
		};
	}

	const normalizedTriggerText = normalizeText(params.triggerText);
	if (isSufficientKnowledgeGapIntentText(normalizedTriggerText)) {
		return {
			text: normalizedTriggerText as string,
			source: "triggerText",
		};
	}

	return null;
}
