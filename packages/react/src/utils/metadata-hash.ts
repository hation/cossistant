/**
 * Computes a deterministic hash from metadata object.
 * This is used to check if metadata has changed without comparing the entire object.
 * Returns a short hash string (first 8 characters of SHA256).
 *
 * Uses Web Crypto when available and falls back to a deterministic non-crypto hash.
 */
export async function computeMetadataHash(
	metadata: Record<string, unknown> | null | undefined
): Promise<string> {
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

	// Use Web Crypto when available (browser and modern Node runtimes)
	if (globalThis.crypto?.subtle) {
		const encoder = new TextEncoder();
		const data = encoder.encode(metadataString);
		const hashBuffer = await globalThis.crypto.subtle.digest("SHA-256", data);
		const hashArray = Array.from(new Uint8Array(hashBuffer));
		const hashHex = hashArray
			.map((b) => b.toString(16).padStart(2, "0"))
			.join("");
		return hashHex.slice(0, 8);
	}

	// FNV-1a fallback for runtimes without Web Crypto.
	let hash = 0x81_1c_9d_c5;
	for (let i = 0; i < metadataString.length; i += 1) {
		hash ^= metadataString.charCodeAt(i);
		hash = Math.imul(hash, 0x01_00_01_93);
	}

	return (hash >>> 0).toString(16).padStart(8, "0");
}
