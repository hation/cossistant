/**
 * Geo and Device Data Helpers
 *
 * Extract geo location and device information from visitor records
 * for analytics tracking.
 */

import type { VisitorSelect } from "@api/db/schema";

export type GeoData = {
	countryCode?: string;
	city?: string;
	latitude?: number;
	longitude?: number;
};

export type DeviceData = {
	deviceType?: string;
	browser?: string;
};

/**
 * Extract geo location data from a visitor record
 */
export function extractGeoFromVisitor(
	record: VisitorSelect | null | undefined
): GeoData | undefined {
	if (!record) {
		return;
	}

	const hasGeoData =
		record.countryCode || record.city || record.latitude || record.longitude;

	if (!hasGeoData) {
		return;
	}

	return {
		countryCode: record.countryCode ?? undefined,
		city: record.city ?? undefined,
		latitude: record.latitude ?? undefined,
		longitude: record.longitude ?? undefined,
	};
}

/**
 * Extract device information from a visitor record
 */
export function extractDeviceFromVisitor(
	record: VisitorSelect | null | undefined
): DeviceData | undefined {
	if (!record) {
		return;
	}

	const hasDeviceData = record.deviceType || record.browser;

	if (!hasDeviceData) {
		return;
	}

	return {
		deviceType: record.deviceType ?? undefined,
		browser: record.browser ?? undefined,
	};
}

/**
 * Extract session ID from visitor record (uses visitor ID as fallback)
 */
export function getSessionId(record: VisitorSelect | null | undefined): string {
	return record?.id ?? "unknown";
}
