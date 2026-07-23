"use client";

import { toast } from "sonner";
import { copyToClipboardWithMeta } from "@/components/copy-button";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icons";
import { TooltipOnHover } from "@/components/ui/tooltip";

type CopyApiKeyButtonProps = {
	apiKey: string;
};

export function CopyApiKeyButton({ apiKey }: CopyApiKeyButtonProps) {
	const handleCopy = async () => {
		try {
			await copyToClipboardWithMeta(apiKey);
			toast.success("API key copied to clipboard");
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Failed to copy API key."
			);
		}
	};

	return (
		<TooltipOnHover content="Copy API key">
			<Button
				onClick={handleCopy}
				size="icon-small"
				type="button"
				variant="ghost"
			>
				<Icon className="size-4" filledOnHover name="clipboard" />
			</Button>
		</TooltipOnHover>
	);
}
