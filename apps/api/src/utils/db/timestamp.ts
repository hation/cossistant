/**
 * @file This file defines a custom Drizzle ORM column type for PostgreSQL timestamps.
 * The primary goal is to extend the built-in `timestamp` type (specifically in 'string' mode)
 * to apply a custom string transformation for parity with PostgREST/SupaBase's date format,
 * which returns timestamps as ISO8601 strings like this:
 *    2025-08-20T00:39:12.702972+00:00
 * whereas drizzle in string mode returns dates as strings like this:
 *    2025-08-20 00:39:12.702972+00
 *
 * This is achieved by subclassing Drizzle's core `PgTimestampStringBuilder` and `PgTimestampString` classes,
 * ensuring that all original convenience methods (like.notNull(),.defaultNow()) are inherited and fully functional.
 */
/** biome-ignore-all lint/performance/useTopLevelRegex: ok here */
/** biome-ignore-all lint/complexity/noUselessConstructor: ok here */

// --- Core Drizzle ORM and PostgreSQL type imports ---
import type {
	ColumnBaseConfig,
	ColumnBuilderBaseConfig,
	Equal,
} from "drizzle-orm";
// --- Drizzle ORM internals for class extension ---
import { entityKind } from "drizzle-orm";
import type { AnyPgTable } from "drizzle-orm/pg-core";
import {
	PgTimestampString,
	PgTimestampStringBuilder,
	timestamp,
} from "drizzle-orm/pg-core";
import type {
	PgTimestampBuilderInitial,
	PgTimestampConfig,
	PgTimestampStringBuilderInitial,
} from "drizzle-orm/pg-core/columns/timestamp";

/**
 * Custom Column Builder for the ISO8601-compatible Timestamp.
 *
 * This class is the heart of the fluent API. It extends Drizzle's native `PgTimestampStringBuilder`
 * to inherit all the chainable methods like `.notNull()`, `.default()`, etc.
 * Its primary responsibility is to construct the column configuration and then, via the `build` method,
 * instantiate our custom `PgTimestampISOString` column class.
 */
export class PgTimestampISOStringBuilder<
	T extends ColumnBuilderBaseConfig<"string", "PgTimestampISOString">,
> extends PgTimestampStringBuilder<
	ColumnBuilderBaseConfig<"string", "PgTimestampString">
> {
	// Drizzle uses this static property internally to identify entity types.
	// Providing a unique name prevents potential conflicts.
	static readonly [entityKind] = "PgTimestampISOStringBuilder";

	constructor(
		name: T["name"],
		withTimezone: boolean,
		precision: number | undefined
	) {
		// Pass all arguments to the parent constructor to ensure the builder is configured correctly.
		super(name, withTimezone, precision);
	}

	/**
	 * This method is called by Drizzle at the end of the schema definition phase.
	 * It must return an instance of the final Column class. We override it to return
	 * our custom `PgTimestampISOString` class, passing it the table instance and the
	 * configuration that has been built up by the fluent API calls.
	 * This is making use of an internal API, so may break!
	 */
	build<TTableName extends string>(
		table: AnyPgTable<{ name: TTableName }>
	): PgTimestampISOString {
		return new PgTimestampISOString(table, this.config);
	}
}

/**
 * Custom Column for the Supabase-compatible Timestamp.
 *
 * This class represents the final column definition in the table schema. It extends Drizzle's
 * `PgTimestampString` to inherit the base behavior of a string-based timestamp.
 * The key customization happens here by overriding the `mapFromDriverValue` method.
 */
export class PgTimestampISOString extends PgTimestampString<
	ColumnBaseConfig<"string", "PgTimestampString">
> {
	// A unique identifier for our custom column class.
	static readonly [entityKind] = "PgTimestampISOString";

	/**
	 * Overrides the default data mapping behavior. This method is called by Drizzle
	 * whenever data is read from the database. It receives the raw string value from the
	 * database driver and transforms it before it's returned to the application.
	 *
	 * The logic here is designed to handle timestamp formats that might not be perfectly
	 * ISO 8601 compliant (e.g., missing 'T' separator or incomplete timezone offset).
	 *
	 * @param pgTimestamp The raw timestamp string from the database (e.g., "2024-01-01 12:00:00+00").
	 * @returns A formatted, ISO 8601-compliant timestamp string.
	 */
	override mapFromDriverValue(pgTimestamp: string): string {
		// Replace the space between date and time with a 'T', a requirement for valid ISO 8601.
		const addedT = pgTimestamp.replace(" ", "T");

		// Regex to find a timezone offset like +05, +0530, or -07.
		const offsetRegex = /([+-])(\d{2})(\d{2})?$/;

		const match = addedT.match(offsetRegex);
		if (match) {
			// Replace the matched offset with a colon-separated version (e.g., +0530 -> +05:30).
			// This ensures maximum compatibility with JavaScript's `new Date()` parser.
			return addedT.replace(
				offsetRegex,
				(
					_match,
					sign: string | null,
					hours: string | null,
					minutes: string | null
				) => {
					const formattedMinutes = minutes ?? "00";
					return `${sign}${hours}:${formattedMinutes}`;
				}
			);
		}

		// No timezone offset found — this happens when the column is
		// `timestamp without time zone`. All timestamps in the app are
		// written as UTC (via .toISOString()), so assume UTC.
		return `${addedT}+00:00`;
	}
}

export type PgTimestampISOStringBuilderInitial<TName extends string> =
	PgTimestampStringBuilderInitial<TName> & {
		columnType: "PgTimestampISOString";
	};

/**
 * Factory function for creating a `isoTimestamp` column.
 *
 * This is the public-facing function that developers will use in their schema definitions.
 * It intelligently delegates to either our custom builder or Drizzle's default `timestamp`
 * builder based on the specified `mode`.
 *
 * By default, it uses `mode: 'string'` to return ISO 8601 formatted strings.
 * To use Date objects instead, explicitly pass `{ mode: 'date' }` in the config.
 *
 * @param a The column name (string) or a config object.
 * @param b The config object if the name was provided as the first argument.
 */
export function isoTimestamp(): PgTimestampISOStringBuilderInitial<"">;
export function isoTimestamp<TMode extends PgTimestampConfig["mode"] & {}>(
	config?: PgTimestampConfig<TMode>
): Equal<TMode, "date"> extends true
	? PgTimestampBuilderInitial<"">
	: PgTimestampISOStringBuilderInitial<"">;
export function isoTimestamp<
	TName extends string,
	TMode extends PgTimestampConfig["mode"] & {},
>(
	name: TName,
	config?: PgTimestampConfig<TMode>
): Equal<TMode, "date"> extends true
	? PgTimestampBuilderInitial<TName>
	: PgTimestampISOStringBuilderInitial<TName>;
export function isoTimestamp<TName extends string>(
	a?: TName | PgTimestampConfig,
	b?: PgTimestampConfig
):
	| PgTimestampISOStringBuilderInitial<TName>
	| PgTimestampBuilderInitial<TName> {
	const { name, config } = getColumnNameAndConfig(a, b ?? {});

	// Default to 'string' mode if not explicitly specified
	const mode = config?.mode ?? "string";

	// If mode is 'string', use our custom builder.
	if (mode === "string") {
		return new PgTimestampISOStringBuilder(
			name,
			config?.withTimezone ?? false,
			config?.precision
		) as unknown as PgTimestampISOStringBuilderInitial<TName>;
	}

	// For any other mode (e.g., 'date'), we fall back to Drizzle's
	// original, unmodified `timestamp` factory function.
	return timestamp(name, config) as PgTimestampBuilderInitial<TName>;
}

/**
 * A helper utility taken from drizzle-orm/src/utils.ts
 */
export function getColumnNameAndConfig(
	a: string | PgTimestampConfig | undefined,
	b: PgTimestampConfig | undefined
) {
	return {
		name: typeof a === "string" && a.length > 0 ? a : ("" as string),
		config: typeof a === "object" ? a : (b as PgTimestampConfig),
	};
}
