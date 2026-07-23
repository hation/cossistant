export const INBOX_ANALYTICS_RANGES = [7, 14, 30] as const;

export type InboxAnalyticsRangeDays = (typeof INBOX_ANALYTICS_RANGES)[number];
