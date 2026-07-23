import { formatInTimeZone } from "date-fns-tz";

export type LocalTimeResult = {
	time: string | null;
	offset: string | null;
};

/**
 * Formats a time for a given timezone and locale.
 * Automatically detects if the locale uses 12-hour or 24-hour format.
 */
export function formatLocalTime(
	timezone: string | null | undefined,
	locale: string | null | undefined
): LocalTimeResult {
	if (!timezone) {
		return { time: null, offset: null };
	}

	const now = new Date();

	// Determine if locale uses 12-hour or 24-hour format
	let hour12 = false;

	if (locale) {
		try {
			const { hourCycle } = new Intl.DateTimeFormat(locale).resolvedOptions();
			hour12 = hourCycle === "h11" || hourCycle === "h12";
		} catch (_error) {
			// Ignore locale resolution failures and use 24-hour format
		}
	}

	try {
		// Format the time in the visitor's timezone
		const timeFormat = hour12 ? "h:mma" : "HH:mm";
		const formattedTime = formatInTimeZone(now, timezone, timeFormat);

		// Calculate GMT offset
		const formatter = new Intl.DateTimeFormat("en-US", {
			timeZone: timezone,
			timeZoneName: "shortOffset",
		});

		const parts = formatter.formatToParts(now);
		const offsetPart = parts.find((part) => part.type === "timeZoneName");

		const gmtOffset = offsetPart?.value ?? "GMT";

		return { time: `${formattedTime}`, offset: gmtOffset };
	} catch (_error) {
		// Fallback if timezone is invalid
		return { time: null, offset: null };
	}
}
