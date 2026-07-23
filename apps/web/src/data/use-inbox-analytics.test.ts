import { describe, expect, it } from "bun:test";
import { parseMetricsFromTinybird } from "./use-inbox-analytics";

describe("parseMetricsFromTinybird", () => {
	it("uses conversation_started to calculate resolution score", () => {
		const result = parseMetricsFromTinybird(
			[
				{
					event_type: "conversation_started",
					median_duration: null,
					event_count: 40,
					period: "current",
				},
				{
					event_type: "conversation_resolved",
					median_duration: 1800,
					event_count: 20,
					period: "current",
				},
				{
					event_type: "first_response",
					median_duration: 120,
					event_count: 20,
					period: "current",
				},
			],
			[
				{
					period: "current",
					unique_visitors: 75,
				},
			],
			{
				period: "current",
				satisfactionSignals: {
					ratingScore: 80,
					sentimentScore: 60,
				},
			}
		);

		expect(result.uniqueVisitors).toBe(75);
		expect(result.aiHandledRate).toBe(0);
		expect(result.satisfactionIndex).toBe(74.5);
	});

	it("hides satisfaction index when previous-period signals are unavailable", () => {
		const result = parseMetricsFromTinybird(
			[
				{
					event_type: "conversation_started",
					median_duration: null,
					event_count: 30,
					period: "previous",
				},
				{
					event_type: "conversation_resolved",
					median_duration: 3600,
					event_count: 21,
					period: "previous",
				},
			],
			[
				{
					period: "previous",
					unique_visitors: 64,
				},
			],
			{
				period: "previous",
				satisfactionSignals: null,
				hideSatisfactionIndex: true,
			}
		);

		expect(result.medianResolutionTimeSeconds).toBe(3600);
		expect(result.uniqueVisitors).toBe(64);
		expect(result.satisfactionIndex).toBeNull();
	});
});
