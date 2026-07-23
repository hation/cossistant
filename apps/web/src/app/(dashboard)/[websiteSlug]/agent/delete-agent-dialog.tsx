"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useTRPC } from "@/lib/trpc/client";

type DeleteAgentDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	agentId: string;
	agentName: string;
	websiteSlug: string;
};

const CONFIRMATION_TEXT = "delete";

export function DeleteAgentDialog({
	open,
	onOpenChange,
	agentId,
	agentName,
	websiteSlug,
}: DeleteAgentDialogProps) {
	const [confirmationInput, setConfirmationInput] = useState("");
	const router = useRouter();
	const trpc = useTRPC();
	const queryClient = useQueryClient();

	const isConfirmed =
		confirmationInput.toLowerCase() === CONFIRMATION_TEXT.toLowerCase();

	const { mutateAsync: deleteAgent, isPending } = useMutation(
		trpc.aiAgent.delete.mutationOptions({
			onSuccess: async () => {
				await queryClient.invalidateQueries({
					queryKey: trpc.aiAgent.get.queryKey({ websiteSlug }),
				});
				toast.success("AI agent deleted successfully.");
				onOpenChange(false);
				router.replace(`/${websiteSlug}/agent/create`);
			},
			onError: (error) => {
				toast.error(error.message || "Failed to delete AI agent.");
			},
		})
	);

	const handleDelete = async () => {
		if (!isConfirmed) {
			return;
		}

		await deleteAgent({
			websiteSlug,
			aiAgentId: agentId,
		});
	};

	const handleOpenChange = (newOpen: boolean) => {
		if (!newOpen) {
			setConfirmationInput("");
		}
		onOpenChange(newOpen);
	};

	return (
		<Dialog onOpenChange={handleOpenChange} open={open}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Delete AI Agent</DialogTitle>
					<DialogDescription>
						This action is permanent and cannot be undone.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					<div className="rounded-md border border-destructive/30 bg-destructive/5 p-4">
						<p className="font-medium text-destructive text-sm">
							Warning: Deleting this agent will permanently remove:
						</p>
						<ul className="mt-2 list-inside list-disc space-y-1 text-destructive text-sm">
							<li>
								All agent settings and configuration for{" "}
								<span className="font-medium text-destructive">
									{agentName}
								</span>
							</li>
							<li>All knowledge base entries tied to this agent</li>
							<li>All web sources and crawl data</li>
						</ul>
					</div>

					<div className="space-y-2">
						<label
							className="font-medium text-sm"
							htmlFor="delete-confirmation"
						>
							Type <span className="font-mono">delete</span> to confirm
						</label>
						<Input
							autoComplete="off"
							disabled={isPending}
							id="delete-confirmation"
							onChange={(e) => setConfirmationInput(e.target.value)}
							placeholder="delete"
							value={confirmationInput}
						/>
					</div>
				</div>

				<DialogFooter>
					<Button
						disabled={isPending}
						onClick={() => handleOpenChange(false)}
						type="button"
						variant="outline"
					>
						Cancel
					</Button>
					<Button
						disabled={!isConfirmed || isPending}
						onClick={handleDelete}
						type="button"
						variant="destructive"
					>
						{isPending ? "Deleting..." : "Delete Agent"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
