import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { extractFilesFromClipboard } from "./upload-constants";

const OriginalFile = globalThis.File;

class MockFile extends Blob implements File {
	readonly lastModified: number;
	readonly name: string;
	readonly webkitRelativePath = "";

	constructor(bits: BlobPart[], name: string, options: FilePropertyBag = {}) {
		super(bits, options);
		this.name = name;
		this.lastModified = options.lastModified ?? 0;
	}
}

function createFile(
	name: string,
	type: string,
	content = "test-content",
	lastModified = 1
): File {
	return new File([content], name, {
		type,
		lastModified,
	});
}

function createFileItem(file: File | null): DataTransferItem {
	return {
		kind: "file",
		type: file?.type ?? "",
		getAsFile: () => file,
	} as DataTransferItem;
}

function createStringItem(): DataTransferItem {
	return {
		kind: "string",
		type: "text/plain",
		getAsFile: () => null,
	} as DataTransferItem;
}

function createClipboardData({
	items = [],
	files = [],
}: {
	items?: DataTransferItem[];
	files?: File[];
}): DataTransfer {
	return {
		items: items as unknown as DataTransferItemList,
		files: files as unknown as FileList,
	} as DataTransfer;
}

beforeAll(() => {
	(globalThis as { File: typeof File }).File =
		MockFile as unknown as typeof File;
});

afterAll(() => {
	(globalThis as { File: typeof File }).File = OriginalFile;
});

describe("extractFilesFromClipboard", () => {
	it("extracts file items from clipboardData.items", () => {
		const file = createFile("image.png", "image/png");
		const clipboardData = createClipboardData({
			items: [createFileItem(file)],
		});

		const extracted = extractFilesFromClipboard(clipboardData);

		expect(extracted).toHaveLength(1);
		expect(extracted[0]?.name).toBe("image.png");
	});

	it("falls back to clipboardData.files when items has no files", () => {
		const file = createFile("notes.txt", "text/plain");
		const clipboardData = createClipboardData({
			items: [createStringItem()],
			files: [file],
		});

		const extracted = extractFilesFromClipboard(clipboardData);

		expect(extracted).toHaveLength(1);
		expect(extracted[0]?.name).toBe("notes.txt");
	});

	it("de-duplicates files from merged items and files collections", () => {
		const fileFromItems = createFile("dup.txt", "text/plain", "same", 123);
		const fileFromFiles = createFile("dup.txt", "text/plain", "same", 123);
		const clipboardData = createClipboardData({
			items: [createFileItem(fileFromItems)],
			files: [fileFromFiles],
		});

		const extracted = extractFilesFromClipboard(clipboardData);

		expect(extracted).toHaveLength(1);
		expect(extracted[0]?.name).toBe("dup.txt");
	});

	it("returns an empty array when clipboard has no files", () => {
		const clipboardData = createClipboardData({
			items: [createStringItem()],
			files: [],
		});

		const extracted = extractFilesFromClipboard(clipboardData);

		expect(extracted).toEqual([]);
	});

	it("preserves existing valid file names", () => {
		const file = createFile("report.pdf", "application/pdf");
		const extracted = extractFilesFromClipboard(
			createClipboardData({ items: [createFileItem(file)] })
		);

		expect(extracted[0]?.name).toBe("report.pdf");
	});

	it("generates fallback names for unnamed clipboard files", () => {
		const unnamedImage = createFile("", "image/png", "png-bytes", 999);
		const extracted = extractFilesFromClipboard(
			createClipboardData({
				items: [createFileItem(unnamedImage)],
			})
		);

		expect(extracted).toHaveLength(1);
		expect(extracted[0]?.name).toBe("pasted-file-1.png");
	});

	it("keeps MIME type and size unchanged when normalizing unnamed files", () => {
		const unnamedImage = createFile("", "image/png", "png-bytes", 777);
		const extracted = extractFilesFromClipboard(
			createClipboardData({
				items: [createFileItem(unnamedImage)],
			})
		);

		expect(extracted).toHaveLength(1);
		expect(extracted[0]?.type).toBe("image/png");
		expect(extracted[0]?.size).toBe(unnamedImage.size);
	});

	it("uses a safe non-empty fallback filename for unknown types", () => {
		const unnamedUnknown = createFile("", "", "binary", 321);
		const extracted = extractFilesFromClipboard(
			createClipboardData({
				items: [createFileItem(unnamedUnknown)],
			})
		);

		expect(extracted).toHaveLength(1);
		expect(extracted[0]?.name).toMatch(/^pasted-file-\d+\.[a-z0-9.+-]+$/);
		expect(extracted[0]?.name.includes("/")).toBe(false);
		expect(extracted[0]?.name.includes("\\")).toBe(false);
	});
});
