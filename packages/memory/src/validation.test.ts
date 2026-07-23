import { describe, expect, it } from "bun:test";
import { MemoryValidationError } from "./errors";
import {
	normalizeContextInput,
	normalizeForgetInput,
	normalizeMemoryMetadata,
	normalizeMemoryWhere,
	normalizeRememberInput,
} from "./validation";

describe("validation", () => {
	it("rejects empty remember content", () => {
		expect(() =>
			normalizeRememberInput(
				{
					content: "   ",
				},
				() => new Date("2026-03-22T10:00:00.000Z")
			)
		).toThrow(MemoryValidationError);
	});

	it("rejects nested metadata objects", () => {
		expect(() =>
			normalizeMemoryMetadata({
				userId: "user_1",
				nested: {
					bad: true,
				},
			})
		).toThrow(MemoryValidationError);
	});

	it("rejects non-finite remember priorities", () => {
		expect(() =>
			normalizeRememberInput(
				{
					content: "A note",
					priority: Number.POSITIVE_INFINITY,
				},
				() => new Date("2026-03-22T10:00:00.000Z")
			)
		).toThrow(/positive integer/);
	});

	it("rejects invalid context limits", () => {
		expect(() =>
			normalizeContextInput({
				limit: 0,
			})
		).toThrow(MemoryValidationError);
	});

	it("rejects empty logical where arrays", () => {
		expect(() =>
			normalizeMemoryWhere({
				and: [],
			})
		).toThrow(/must not be empty/);
	});

	it("rejects forget inputs that provide both id and where", () => {
		expect(() =>
			normalizeForgetInput({
				id: "01JV0M2T2BEMM3J4Z6R2J7D1PH",
				where: { userId: "user_1" },
			} as never)
		).toThrow(MemoryValidationError);
	});
});
