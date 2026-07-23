/**
 * File upload constants for cost/API protection.
 * These limits are enforced on both client and server side.
 */

/** Maximum file size in bytes (5 MB) */
export const MAX_FILE_SIZE = 5 * 1024 * 1024;

/** Maximum number of files per message */
export const MAX_FILES_PER_MESSAGE = 3;

/** Allowed MIME types for file uploads */
export const ALLOWED_MIME_TYPES = [
	// Images
	"image/jpeg",
	"image/png",
	"image/gif",
	"image/webp",
	// Documents
	"application/pdf",
	// Text files
	"text/plain",
	"text/csv",
	"text/markdown",
	// Archives
	"application/zip",
] as const;

/** Human-readable file type descriptions for error messages */
export const ALLOWED_FILE_TYPES_DESCRIPTION =
	"images (JPEG, PNG, GIF, WebP), PDF, text files (TXT, CSV, MD), and ZIP archives";

/** Accept string for file input elements */
export const FILE_INPUT_ACCEPT = ALLOWED_MIME_TYPES.join(",");

const MIME_TYPE_EXTENSION_MAP: Record<string, string> = {
	"image/jpeg": "jpg",
	"image/png": "png",
	"image/gif": "gif",
	"image/webp": "webp",
	"application/pdf": "pdf",
	"text/plain": "txt",
	"text/csv": "csv",
	"text/markdown": "md",
	"application/zip": "zip",
};

function getFileExtensionFromMimeType(mimeType: string): string {
	const normalizedType = mimeType.trim().toLowerCase();
	if (!normalizedType) {
		return "bin";
	}

	const mappedExtension = MIME_TYPE_EXTENSION_MAP[normalizedType];
	if (mappedExtension) {
		return mappedExtension;
	}

	const slashIndex = normalizedType.indexOf("/");
	if (slashIndex === -1 || slashIndex === normalizedType.length - 1) {
		return "bin";
	}

	const subtype = normalizedType
		.slice(slashIndex + 1)
		.split(";")[0]
		?.trim();
	if (!subtype) {
		return "bin";
	}

	const safeSubtype = subtype.replace(/[^a-z0-9.+-]/g, "");
	return safeSubtype || "bin";
}

function normalizeClipboardFile(file: File, unnamedFileIndex: number): File {
	const fileName = file.name?.trim() ?? "";
	if (fileName.length > 0) {
		return file;
	}

	const extension = getFileExtensionFromMimeType(file.type);
	const fallbackName = `pasted-file-${unnamedFileIndex}.${extension}`;

	return new File([file], fallbackName, {
		type: file.type,
		lastModified: file.lastModified || Date.now(),
	});
}

/**
 * Extract files from clipboard data for paste-to-attach flows.
 *
 * Reads from both clipboard `items` and `files`, de-duplicates merged entries
 * and normalizes unnamed clipboard files with safe fallback names.
 */
export function extractFilesFromClipboard(
	clipboardData: DataTransfer | null | undefined
): File[] {
	if (!clipboardData) {
		return [];
	}

	const candidateFiles: File[] = [];

	for (const item of Array.from(clipboardData.items || [])) {
		if (item.kind !== "file") {
			continue;
		}

		const file = item.getAsFile();
		if (file) {
			candidateFiles.push(file);
		}
	}

	for (const file of Array.from(clipboardData.files || [])) {
		candidateFiles.push(file);
	}

	if (candidateFiles.length === 0) {
		return [];
	}

	const dedupedFiles: File[] = [];
	const seenKeys = new Set<string>();
	let unnamedFileCount = 0;

	for (const file of candidateFiles) {
		const fileName = file.name ?? "";
		const dedupeKey = [
			fileName,
			file.type,
			String(file.size),
			String(file.lastModified),
		].join("|");

		if (seenKeys.has(dedupeKey)) {
			continue;
		}
		seenKeys.add(dedupeKey);

		if (fileName.trim().length === 0) {
			unnamedFileCount += 1;
			dedupedFiles.push(normalizeClipboardFile(file, unnamedFileCount));
			continue;
		}

		dedupedFiles.push(file);
	}

	return dedupedFiles;
}

/**
 * Check if a MIME type is allowed for upload
 */
export function isAllowedMimeType(mimeType: string): boolean {
	return (ALLOWED_MIME_TYPES as readonly string[]).includes(mimeType);
}

/**
 * Check if a file is an image based on MIME type
 */
export function isImageMimeType(mimeType: string): boolean {
	return mimeType.startsWith("image/");
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
	if (bytes < 1024) {
		return `${bytes} B`;
	}
	if (bytes < 1024 * 1024) {
		return `${(bytes / 1024).toFixed(1)} KB`;
	}
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Validate a file against upload constraints
 * @returns null if valid, error message if invalid
 */
export function validateFile(file: File): string | null {
	if (file.size > MAX_FILE_SIZE) {
		return `File "${file.name}" exceeds maximum size of ${formatFileSize(MAX_FILE_SIZE)}`;
	}

	if (!isAllowedMimeType(file.type)) {
		return `File type "${file.type || "unknown"}" is not allowed. Allowed types: ${ALLOWED_FILE_TYPES_DESCRIPTION}`;
	}

	return null;
}

/**
 * Validate multiple files against upload constraints
 * @returns null if all valid, error message if any invalid
 */
export function validateFiles(files: File[]): string | null {
	if (files.length > MAX_FILES_PER_MESSAGE) {
		return `Cannot attach more than ${MAX_FILES_PER_MESSAGE} files per message`;
	}

	for (const file of files) {
		const error = validateFile(file);
		if (error) {
			return error;
		}
	}

	return null;
}
