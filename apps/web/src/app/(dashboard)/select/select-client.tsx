"use client";

import type { OrganizationSelect, WebsiteSelect } from "@api/db/schema";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { switchWebsite } from "@/app/actions/switch-website";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { WebsiteImage } from "@/components/ui/website-image";
import { authClient } from "@/lib/auth/client";
import { useTRPC } from "@/lib/trpc/client";

type SelectClientProps = {
	organizations: {
		organization: OrganizationSelect;
		role: string;
		joinedAt: Date;
		websites: WebsiteSelect[];
	}[];
};

export default function SelectClient({ organizations }: SelectClientProps) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [selectedWebsiteId, setSelectedWebsiteId] = useState<string | null>(
		null
	);

	const handleSelectWebsite = (websiteId: string) => {
		setSelectedWebsiteId(websiteId);
		startTransition(async () => {
			try {
				const slug = await switchWebsite(websiteId);
				router.push(`/${slug}/inbox`);
			} catch (error) {
				console.error("Failed to select website:", error);
				setSelectedWebsiteId(null);
			}
		});
	};

	// Auto-redirect if user has only one website
	useEffect(() => {
		if (organizations && !isPending) {
			const allWebsites = organizations.flatMap((org) =>
				org.websites.map((website) => ({
					...website,
					organizationSlug: org.organization.slug,
				}))
			);

			// If no organizations, this shouldn't happen but handle gracefully
			if (organizations.length === 0) {
				router.push("/");
				return;
			}

			// If no websites in any organization, redirect to welcome page
			if (allWebsites.length === 0 && organizations[0]) {
				router.push(`/welcome/${organizations[0].organization.slug}`);
				return;
			}

			// If exactly one website, auto-select it
			if (allWebsites.length === 1) {
				const website = allWebsites[0];
				if (website) {
					handleSelectWebsite(website.id);
				}
			}
		}
	}, [organizations, isPending, router, handleSelectWebsite]);

	const allWebsites = organizations.flatMap((org) =>
		org.websites.map((website) => ({
			...website,
			organizationName: org.organization.name,
			organizationSlug: org.organization.slug,
		}))
	);

	// If we're in the process of selecting a website, show loading
	if (isPending || selectedWebsiteId) {
		return (
			<div className="flex h-screen w-screen items-center justify-center">
				<div className="flex flex-col items-center gap-4">
					<Logo className="size-12 animate-pulse" />
					<p className="text-muted-foreground text-sm">Redirecting...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="flex h-screen w-screen items-center justify-center bg-background">
			<div className="w-full max-w-md space-y-8 p-8">
				<div className="flex flex-col items-center gap-4">
					<Logo className="size-8" />
					<div className="text-center">
						<h1 className="font-semibold text-2xl">Select a website</h1>
						<p className="mt-2 text-muted-foreground text-sm">
							Choose which website you'd like to access
						</p>
					</div>
				</div>

				<div className="space-y-2">
					{allWebsites.map((website) => (
						<button
							className="flex w-full items-center gap-4 rounded border border-border bg-background-100 p-2 pl-3 text-left transition hover:cursor-pointer hover:border-border hover:bg-background-200 disabled:opacity-50 dark:hover:bg-background-300"
							disabled={isPending}
							key={website.id}
							onClick={() => handleSelectWebsite(website.id)}
							type="button"
						>
							<WebsiteImage
								className="size-8"
								logoUrl={website.logoUrl}
								name={website.name}
							/>
							<div className="flex-1">
								<p className="font-medium text-sm">{website.name}</p>
								<p className="text-muted-foreground text-sm">
									{website.domain}
								</p>
							</div>
							{/* <div className="text-muted-foreground text-xs">
                {website.organizationName}
              </div> */}
						</button>
					))}
				</div>

				<div className="text-center">
					<Button
						className="w-full"
						onClick={() => {
							if (organizations[0]) {
								router.push(`/welcome/${organizations[0].organization.slug}`);
							}
						}}
						variant="ghost"
					>
						Create new website
					</Button>
				</div>
			</div>
		</div>
	);
}
