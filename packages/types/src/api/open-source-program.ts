import { z } from "@hono/zod-openapi";

export const OPEN_SOURCE_PROGRAM_QUALIFICATION_REASONS = [
	"github-stars",
	"real-users",
	"saas-product",
] as const;

function isGitHubRepositoryUrl(url: string): boolean {
	try {
		const parsed = new URL(url);
		const hostname = parsed.hostname.replace(/^www\./, "").toLowerCase();
		const segments = parsed.pathname.split("/").filter(Boolean);

		return (
			parsed.protocol === "https:" &&
			hostname === "github.com" &&
			segments.length >= 2 &&
			segments[0] !== "orgs"
		);
	} catch {
		return false;
	}
}

export const openSourceProgramQualificationReasonSchema = z
	.enum(OPEN_SOURCE_PROGRAM_QUALIFICATION_REASONS)
	.openapi({
		description: "A qualification reason used for OSS program eligibility.",
		example: "github-stars",
	});

export type OpenSourceProgramQualificationReason = z.infer<
	typeof openSourceProgramQualificationReasonSchema
>;

export const submitOpenSourceProgramApplicationRequestSchema = z
	.object({
		websiteId: z.ulid().openapi({
			description: "The selected website requesting OSS program access.",
			example: "01JG000000000000000000000",
		}),
		repositoryUrl: z
			.url()
			.refine(isGitHubRepositoryUrl, {
				message: "Repository URL must point to a public GitHub repository.",
			})
			.openapi({
				description: "The GitHub repository URL for the OSS project.",
				example: "https://github.com/acme/project",
			}),
		qualificationReasons: z
			.array(openSourceProgramQualificationReasonSchema)
			.min(1, {
				message: "Select at least one qualification reason.",
			})
			.openapi({
				description:
					"The qualification reasons the applicant meets for the OSS program.",
				example: ["github-stars"],
			}),
		githubStars: z.number().int().nonnegative().optional().openapi({
			description:
				"Approximate GitHub star count when applying under the GitHub stars qualification.",
			example: 128,
		}),
		realUsersOrTrafficProof: z.string().max(2000).optional().openapi({
			description:
				"Self-reported proof of real users, usage, or traffic for manual review.",
			example:
				"Serving 4,000 monthly active users across 200 customer workspaces.",
		}),
		saasProductProof: z.string().max(2000).optional().openapi({
			description:
				"Self-reported proof that the OSS project powers a legitimate SaaS product.",
			example:
				"Our hosted product runs on top of this OSS repo and is used by paying teams.",
		}),
		isMonetized: z.boolean().openapi({
			description:
				"Whether the OSS project or product built on top of it currently makes money.",
			example: false,
		}),
		monthlyRecurringRevenueUsd: z.number().nonnegative().optional().openapi({
			description:
				"Monthly recurring revenue in USD when the project is monetized.",
			example: 4200,
		}),
		notes: z.string().max(2000).optional().openapi({
			description: "Optional context or notes for the Cossistant team.",
			example:
				"We already use the widget in our docs app and would love support polishing the onboarding flow.",
		}),
		acknowledgePublicRepo: z.boolean().refine((value) => value, {
			message: "You must confirm the repository is public.",
		}),
		acknowledgeRecentCommits: z.boolean().refine((value) => value, {
			message: "You must confirm the project is actively maintained.",
		}),
		acknowledgeWidgetMention: z.boolean().refine((value) => value, {
			message: "You must keep the Cossistant mention in the widget.",
		}),
		acknowledgeReadmeBadge: z.boolean().refine((value) => value, {
			message: "You must add the Cossistant README badge.",
		}),
	})
	.superRefine((value, ctx) => {
		if (
			value.qualificationReasons.includes("github-stars") &&
			(typeof value.githubStars !== "number" || value.githubStars < 100)
		) {
			ctx.addIssue({
				code: "custom",
				path: ["githubStars"],
				message:
					"GitHub stars must be provided and be at least 100 for this qualification path.",
			});
		}

		if (
			value.qualificationReasons.includes("real-users") &&
			!value.realUsersOrTrafficProof?.trim()
		) {
			ctx.addIssue({
				code: "custom",
				path: ["realUsersOrTrafficProof"],
				message: "Add a short proof summary for real users or traffic.",
			});
		}

		if (
			value.qualificationReasons.includes("saas-product") &&
			!value.saasProductProof?.trim()
		) {
			ctx.addIssue({
				code: "custom",
				path: ["saasProductProof"],
				message: "Add a short proof summary for the SaaS product built on top.",
			});
		}
	})
	.openapi({
		description: "Submission payload for the Cossistant OSS program.",
	});

export type SubmitOpenSourceProgramApplicationRequest = z.infer<
	typeof submitOpenSourceProgramApplicationRequestSchema
>;

export const submitOpenSourceProgramApplicationResponseSchema = z
	.object({
		success: z.literal(true).openapi({
			description: "Whether the application was accepted for review.",
			example: true,
		}),
		message: z.string().openapi({
			description: "Human-readable confirmation text for the applicant.",
			example: "Your OSS program application has been sent for review.",
		}),
	})
	.openapi({
		description:
			"Confirmation payload after sending an OSS program application.",
	});

export type SubmitOpenSourceProgramApplicationResponse = z.infer<
	typeof submitOpenSourceProgramApplicationResponseSchema
>;
