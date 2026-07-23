"use client";

import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

type ManualDescriptionInputProps = {
	crawlEnabled: boolean;
	urlWasProvided: boolean;
	manualDescription: string;
	setManualDescription: (description: string) => void;
	isAnalyzing: boolean;
	onGenerate: () => void;
};

export function ManualDescriptionInput({
	crawlEnabled,
	urlWasProvided,
	manualDescription,
	setManualDescription,
	isAnalyzing,
	onGenerate,
}: ManualDescriptionInputProps) {
	const title = crawlEnabled
		? urlWasProvided
			? "We couldn't detect a description from your website"
			: "Tell us about your business"
		: "Tell us about your business";

	return (
		<motion.div
			animate={{ opacity: 1, y: 0 }}
			className="space-y-4 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4"
			initial={{ opacity: 0, y: -10 }}
		>
			<div className="flex items-start gap-3">
				<Icon className="mt-0.5 size-4 text-amber-500" name="help" />
				<div className="min-w-0 flex-1 space-y-3">
					<div>
						<p className="font-medium text-sm">{title}</p>
						<p className="mt-1 text-muted-foreground text-xs">
							Add a brief description to personalize your agent's prompt
						</p>
					</div>
					<div className="space-y-2">
						<Input
							disabled={isAnalyzing}
							onChange={(e) => setManualDescription(e.target.value)}
							placeholder="We help customers with..."
							value={manualDescription}
						/>
						<Button
							disabled={!manualDescription.trim() || isAnalyzing}
							onClick={onGenerate}
							size="sm"
							type="button"
						>
							{isAnalyzing ? (
								<>
									<Spinner className="mr-2 size-3" />
									Generating...
								</>
							) : (
								<>
									Generate Prompt
									<Icon className="ml-2 size-3" name="star" />
								</>
							)}
						</Button>
					</div>
				</div>
			</div>
		</motion.div>
	);
}
