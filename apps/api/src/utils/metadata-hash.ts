import { createHash } from "node:crypto";

/**
 * Computes a deterministic hash from metadata object.
 * This is used to check if metadata has changed without comparing the entire object.
 * Returns a short hash string (first 8 characters of SHA256).
 */
export function computeMetadataHash(
	metadata: Record<string, unknown> | null | undefined
): string {
	if (!metadata || Object.keys(metadata).length === 0) {
		return "";
	}

	// Sort keys to ensure deterministic output
	const sortedKeys = Object.keys(metadata).sort();
	const sortedMetadata = sortedKeys.reduce(
		(acc, key) => {
			acc[key] = metadata[key];
			return acc;
		},
		{} as Record<string, unknown>
	);

	// Create a stable string representation
	const metadataString = JSON.stringify(sortedMetadata);

	// Compute SHA256 hash and return first 8 characters
	return createHash("sha256").update(metadataString).digest("hex").slice(0, 8);
}
