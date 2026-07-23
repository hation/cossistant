const PROTOCOL_REGEX = /^https?:\/\//i;
const PATH_REGEX = /[/?#]/;

export const normalizeDomain = (domain: string): string => {
	const trimmed = domain.trim();

	if (!trimmed) {
		throw new Error("Domain cannot be empty");
	}

	const withoutProtocol = trimmed.replace(PROTOCOL_REGEX, "");
	const withoutPath = withoutProtocol.split(PATH_REGEX, 1)[0] ?? "";
	const hostname = withoutPath.split(":", 1)[0]?.trim() ?? "";

	if (!hostname) {
		throw new Error("Domain cannot be empty");
	}

	return hostname.toLowerCase();
};
