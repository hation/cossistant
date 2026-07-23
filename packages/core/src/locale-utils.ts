/**
 * Normalize a locale string to its base language code
 * Examples:
 * - "en-US" -> "en"
 * - "en-GB" -> "en"
 * - "fr-FR" -> "fr"
 * - "es-ES" -> "es"
 * - null -> null
 *
 * @param locale - The locale string to normalize (e.g., "en-US", "fr-FR")
 * @returns The normalized base language code (e.g., "en", "fr") or null if input is null/undefined
 */
export function normalizeLocale(
	locale: string | null | undefined
): string | null {
	if (!locale) {
		return null;
	}

	// Convert to lowercase and extract base language code
	const normalized = locale.toLowerCase();
	const [base] = normalized.split("-");

	return base || null;
}
