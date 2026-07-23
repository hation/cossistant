import { describe, expect, it } from "bun:test";
import { submitOpenSourceProgramApplicationRequestSchema } from "../src/api/open-source-program";

function createValidRequest() {
	return {
		websiteId: "01JG0000000000000000000000",
		repositoryUrl: "https://github.com/acme/oss-project",
		qualificationReasons: ["github-stars"] as const,
		githubStars: 128,
		realUsersOrTrafficProof: undefined,
		saasProductProof: undefined,
		isMonetized: false,
		monthlyRecurringRevenueUsd: undefined,
		notes: "We would love help polishing our support flow.",
		acknowledgePublicRepo: true,
		acknowledgeRecentCommits: true,
		acknowledgeWidgetMention: true,
		acknowledgeReadmeBadge: true,
	};
}

describe("open-source program request schema", () => {
	it("accepts a valid GitHub stars submission", () => {
		const result = submitOpenSourceProgramApplicationRequestSchema.parse(
			createValidRequest()
		);

		expect(result.repositoryUrl).toBe("https://github.com/acme/oss-project");
		expect(result.qualificationReasons).toEqual(["github-stars"]);
	});

	it("rejects submissions without a qualification reason", () => {
		const result = submitOpenSourceProgramApplicationRequestSchema.safeParse({
			...createValidRequest(),
			qualificationReasons: [],
		});

		expect(result.success).toBe(false);
		expect(result.error?.issues[0]?.path).toEqual(["qualificationReasons"]);
	});

	it("rejects non-GitHub repository URLs", () => {
		const result = submitOpenSourceProgramApplicationRequestSchema.safeParse({
			...createValidRequest(),
			repositoryUrl: "https://gitlab.com/acme/oss-project",
		});

		expect(result.success).toBe(false);
		expect(
			result.error?.issues.some((issue) => issue.path[0] === "repositoryUrl")
		).toBe(true);
	});

	it("allows monetized projects without MRR", () => {
		const result = submitOpenSourceProgramApplicationRequestSchema.safeParse({
			...createValidRequest(),
			isMonetized: true,
			monthlyRecurringRevenueUsd: undefined,
		});

		expect(result.success).toBe(true);
	});

	it("allows monetized projects at or above ten thousand MRR", () => {
		const result = submitOpenSourceProgramApplicationRequestSchema.safeParse({
			...createValidRequest(),
			isMonetized: true,
			monthlyRecurringRevenueUsd: 10_000,
		});

		expect(result.success).toBe(true);
	});

	it("requires proof for qualification paths that need supporting context", () => {
		const result = submitOpenSourceProgramApplicationRequestSchema.safeParse({
			...createValidRequest(),
			qualificationReasons: ["real-users", "saas-product"],
			githubStars: undefined,
			realUsersOrTrafficProof: "   ",
			saasProductProof: "",
		});

		expect(result.success).toBe(false);
		expect(
			result.error?.issues.some(
				(issue) => issue.path[0] === "realUsersOrTrafficProof"
			)
		).toBe(true);
		expect(
			result.error?.issues.some((issue) => issue.path[0] === "saasProductProof")
		).toBe(true);
	});
});
