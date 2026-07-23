// utils/ids.ts

import { createHash } from "node:crypto";
import { varchar } from "drizzle-orm/pg-core";
import { customAlphabet } from "nanoid";
import { ulid as ulidGenerator } from "ulid";

// Crockford's Base32 alphabet (used by ULID)
const CROCKFORD_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

const NANOID_ALPHABET = "123456789ABCDEFGHIJKLMNPQRSTUVWXYZ";
const NANOID_LENGTH = 16;

export const generateShortPrimaryId = (): string => {
	const nanoid = customAlphabet(NANOID_ALPHABET, NANOID_LENGTH);
	return `CO${nanoid()}`; // e.g. "CO4GKT9QZ2BJKXMVR"
};

export const generateULID = (): string => {
	return ulidGenerator(); // e.g. "01J3400000000000000000000"
};

/**
 * Reusable VARCHAR primary key column using ULID
 */
export const ulidPrimaryKey = (name: string) =>
	varchar(name, { length: 26 }).primaryKey().notNull().$defaultFn(generateULID);

/**
 * Reusable VARCHAR primary key column using short NanoID
 */
export const nanoidPrimaryKey = (name: string) =>
	varchar(name, { length: 18 })
		.primaryKey()
		.notNull()
		.$defaultFn(generateShortPrimaryId);

/**
 * Reusable VARCHAR reference column using ULID
 */
export const ulidReference = (name: string) =>
	varchar(name, { length: 26 }).notNull();

export const ulidNullableReference = (name: string) =>
	varchar(name, { length: 26 });

/**
 * Reusable VARCHAR reference column using short NanoID
 */
export const nanoidReference = (name: string) =>
	varchar(name, { length: 18 }).notNull();

/**
 * Generate a deterministic 26-char ULID-like ID from an idempotency key.
 * Same input always produces the same output.
 * Uses SHA-256 hash encoded with Crockford Base32 (ULID alphabet).
 */
export const generateIdempotentULID = (idempotencyKey: string): string => {
	const hash = createHash("sha256").update(idempotencyKey).digest();

	// Encode first 16 bytes as Crockford Base32 to get 26 chars
	let result = "";
	for (let i = 0; i < 16 && result.length < 26; i++) {
		const byte = hash[i];
		if (byte === undefined) {
			break;
		}
		result += CROCKFORD_ALPHABET[byte & 0x1f]; // Lower 5 bits
		if (result.length < 26) {
			result += CROCKFORD_ALPHABET[(byte >> 3) & 0x1f]; // Upper 5 bits
		}
	}

	return result.slice(0, 26);
};
