import {
	differenceInDays,
	differenceInHours,
	differenceInMinutes,
	differenceInMonths,
	differenceInYears,
	format,
	formatDistanceToNow,
	isAfter,
	isSameDay,
} from "date-fns";

export function formatTimeAgo(date: Date, now: Date = new Date()): string {
	const diffHours = differenceInHours(now, date);
	const diffDays = differenceInDays(now, date);

	// For times less than 24 hours ago, show the actual time
	if (diffHours < 24) {
		// Detect user's locale to determine 12-hour vs 24-hour format
		// Check for navigator existence to handle SSR
		let userLocale = "en-US";
		let uses12HourFormat = false;

		if (typeof navigator !== "undefined" && navigator.language) {
			userLocale = navigator.language;
			try {
				uses12HourFormat =
					new Intl.DateTimeFormat(userLocale, {
						hour: "numeric",
					}).resolvedOptions().hour12 ?? false;
			} catch {
				// Fallback to 24-hour format if locale resolution fails
				uses12HourFormat = false;
			}
		}

		// Format the time based on user's locale preference
		const timeFormat = uses12HourFormat ? "h:mm a" : "HH:mm";

		return format(date, timeFormat);
	}

	if (diffDays < 7) {
		return `${diffDays}d`;
	}

	if (diffDays < 30) {
		const weeks = Math.floor(diffDays / 7);
		return weeks === 1 ? "1w" : `${weeks}w`;
	}

	// For older dates, show the actual date
	const currentYear = now.getFullYear();
	const dateYear = date.getFullYear();

	if (dateYear === currentYear) {
		return format(date, "MMM d");
	}
	return format(date, "MMM d, yyyy");
}

export function getWaitingSinceLabel(
	from: Date,
	now: Date = new Date()
): string {
	if (isAfter(from, now)) {
		return "<1m";
	}

	const minutes = differenceInMinutes(now, from);

	if (minutes < 1) {
		return "<1m";
	}

	if (minutes < 60) {
		return `${minutes}m`;
	}

	const hours = differenceInHours(now, from);

	if (hours < 24) {
		return `${hours}h`;
	}

	const days = differenceInDays(now, from);

	if (days < 7) {
		return `${days}d`;
	}

	const weeks = Math.max(1, Math.floor(days / 7));

	if (weeks < 5) {
		return `${weeks}w`;
	}

	const months = Math.max(1, differenceInMonths(now, from));

	if (months < 12) {
		return `${months}mo`;
	}

	const years = Math.max(1, differenceInYears(now, from));

	return `${years}y`;
}

function getUserLocale(): string {
	if (typeof navigator !== "undefined" && navigator.language) {
		return navigator.language;
	}
	return "en-US";
}

/**
 * Formats a "last seen" date with relative time for today, locale-aware format for other days.
 * - Today: "2 hours ago", "30 minutes ago"
 * - Other days: Locale-aware date and time (e.g., "Dec 25, 2024, 2:30 PM" or "25 déc. 2024, 14:30")
 */
export function formatLastSeenAt(date: Date, now: Date = new Date()): string {
	if (isSameDay(date, now)) {
		return formatDistanceToNow(date, { addSuffix: true });
	}

	const userLocale = getUserLocale();

	try {
		return new Intl.DateTimeFormat(userLocale, {
			dateStyle: "medium",
			timeStyle: "short",
		}).format(date);
	} catch {
		return format(date, "MMM d, yyyy 'at' HH:mm");
	}
}

/**
 * Formats a date with full date and time for tooltip display.
 * Uses locale-aware formatting with full weekday, date, and time.
 */
export function formatFullDateTime(date: Date): string {
	const userLocale = getUserLocale();

	try {
		return new Intl.DateTimeFormat(userLocale, {
			weekday: "long",
			year: "numeric",
			month: "long",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
		}).format(date);
	} catch {
		return format(date, "EEEE, MMMM d, yyyy 'at' HH:mm:ss");
	}
}
