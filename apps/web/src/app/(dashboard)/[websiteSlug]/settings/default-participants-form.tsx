"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { BaseSubmitButton } from "@/components/ui/base-submit-button";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SettingsRowFooter } from "@/components/ui/layout/settings-layout";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { UserSelect } from "@/components/ui/user-select";
import { useWebsiteMembers } from "@/contexts/website";
import { useTRPC } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

type DefaultParticipantsFormProps = {
	websiteId: string;
	websiteSlug: string;
	organizationId: string;
	initialDefaultParticipantIds: string[] | null;
};

type ParticipantMode = "disabled" | "auto" | "custom";

export function DefaultParticipantsForm({
	websiteId,
	websiteSlug,
	organizationId,
	initialDefaultParticipantIds,
}: DefaultParticipantsFormProps) {
	const router = useRouter();
	const members = useWebsiteMembers();
	const trpc = useTRPC();

	// Determine initial mode
	const getInitialMode = (): ParticipantMode => {
		if (initialDefaultParticipantIds === null) {
			return "disabled";
		}
		if (initialDefaultParticipantIds.length === 0) {
			return "auto";
		}
		return "custom";
	};

	const [mode, setMode] = useState<ParticipantMode>(getInitialMode());
	const [selectedUserIds, setSelectedUserIds] = useState<string[]>(
		initialDefaultParticipantIds && initialDefaultParticipantIds.length > 0
			? initialDefaultParticipantIds
			: []
	);

	const { mutateAsync: updateWebsite, isPending } = useMutation(
		trpc.website.update.mutationOptions({
			onSuccess: () => {
				toast.success("Default participants updated");
				router.refresh();
			},
			onError: (error) => {
				toast.error(error.message || "Failed to update default participants");
			},
		})
	);

	const handleSubmit = useCallback(
		async (e: React.FormEvent) => {
			e.preventDefault();

			let defaultParticipantIds: string[] | null;

			switch (mode) {
				case "disabled":
					defaultParticipantIds = null;
					break;
				case "auto":
					defaultParticipantIds = [];
					break;
				case "custom":
					if (selectedUserIds.length === 0) {
						toast.error("Please select at least one user");
						return;
					}
					defaultParticipantIds = selectedUserIds;
					break;
				default:
					defaultParticipantIds = [];
					break;
			}

			await updateWebsite({
				organizationId,
				websiteId,
				data: {
					defaultParticipantIds,
				},
			});
		},
		[mode, selectedUserIds, updateWebsite, organizationId, websiteId]
	);

	const isFormDirty = () => {
		const currentValue =
			mode === "disabled" ? null : mode === "auto" ? [] : selectedUserIds;
		const initialValue = initialDefaultParticipantIds;

		if (currentValue === null && initialValue === null) {
			return false;
		}
		if (currentValue === null || initialValue === null) {
			return true;
		}
		if (currentValue.length !== initialValue.length) {
			return true;
		}
		return !currentValue.every((id) => initialValue.includes(id));
	};

	return (
		<form className="space-y-6" onSubmit={handleSubmit}>
			<div className="space-y-4 p-4">
				<div className="flex items-center justify-between">
					<div className="space-y-0.5">
						<Label htmlFor="enable-defaults">Enable default participants</Label>
						<p className="text-muted-foreground text-sm">
							Automatically add team members to new conversations
						</p>
					</div>
					<Switch
						checked={mode !== "disabled"}
						id="enable-defaults"
						onCheckedChange={(checked) => {
							setMode(checked ? "auto" : "disabled");
						}}
					/>
				</div>

				{mode !== "disabled" && (
					<RadioGroup
						className="space-y-3"
						onValueChange={(value) => setMode(value as ParticipantMode)}
						value={mode}
					>
						<div className="flex items-start space-x-3">
							<RadioGroupItem className="mt-1" id="auto" value="auto" />
							<div className="space-y-0.5">
								<Label className="cursor-pointer font-normal" htmlFor="auto">
									Automatic (Admin & Owner)
								</Label>
								<p className="text-muted-foreground text-sm">
									Add all admins and owners as participants
								</p>
							</div>
						</div>

						<div className="flex items-start space-x-3">
							<RadioGroupItem className="mt-1" id="custom" value="custom" />
							<div className="space-y-0.5">
								<Label className="cursor-pointer font-normal" htmlFor="custom">
									Select specific members
								</Label>
								<p className="text-muted-foreground text-sm">
									Choose which team members to add by default
								</p>
							</div>
						</div>
					</RadioGroup>
				)}

				{mode === "custom" && (
					<div className="space-y-2">
						<Label>Select team members</Label>
						<UserSelect
							disabled={isPending}
							onChange={setSelectedUserIds}
							placeholder="Select team members..."
							users={members}
							value={selectedUserIds}
						/>
					</div>
				)}
			</div>
			<SettingsRowFooter className="flex items-center justify-end gap-2">
				<BaseSubmitButton
					disabled={isPending || !isFormDirty()}
					isSubmitting={isPending}
					type="submit"
				>
					Save default participants
				</BaseSubmitButton>
			</SettingsRowFooter>
		</form>
	);
}
