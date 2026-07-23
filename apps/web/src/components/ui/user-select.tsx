"use client";

import { Check, ChevronsUpDown, X } from "lucide-react";
import { useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type User = {
	id: string;
	name?: string | null;
	email?: string | null;
	image?: string | null;
};

type UserSelectProps = {
	users: User[];
	value: string[];
	onChange: (value: string[]) => void;
	placeholder?: string;
	className?: string;
	disabled?: boolean;
};

export function UserSelect({
	users,
	value,
	onChange,
	placeholder = "Select users...",
	className,
	disabled,
}: UserSelectProps) {
	const [open, setOpen] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");

	const selectedUsers = users.filter((user) => value.includes(user.id));

	const filteredUsers = users.filter((user) => {
		const displayName = user.name || user.email || "Unknown";
		return displayName.toLowerCase().includes(searchQuery.toLowerCase());
	});

	const toggleUser = (userId: string) => {
		if (value.includes(userId)) {
			onChange(value.filter((id) => id !== userId));
		} else {
			onChange([...value, userId]);
		}
	};

	const removeUser = (userId: string) => {
		onChange(value.filter((id) => id !== userId));
	};

	const getUserDisplayName = (user: User) =>
		user.name || user.email || "Unknown";

	return (
		<div className={cn("space-y-2", className)}>
			<Popover onOpenChange={setOpen} open={open}>
				<PopoverTrigger asChild>
					<Button
						aria-expanded={open}
						aria-label="Select users"
						className={cn(
							"w-full justify-between",
							!value.length && "text-muted-foreground"
						)}
						disabled={disabled}
						role="combobox"
						variant="outline"
					>
						<span className="truncate">
							{value.length > 0
								? `${value.length} user${value.length === 1 ? "" : "s"} selected`
								: placeholder}
						</span>
						<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-[400px] p-0">
					<Command>
						<CommandInput
							onValueChange={setSearchQuery}
							placeholder="Search users..."
							value={searchQuery}
						/>
						<CommandList>
							<CommandEmpty>No users found.</CommandEmpty>
							<CommandGroup>
								{filteredUsers.map((user) => (
									<CommandItem
										key={user.id}
										onSelect={() => toggleUser(user.id)}
										value={user.id}
									>
										<div className="flex flex-1 items-center gap-2">
											<Avatar
												className="size-6"
												fallbackName={getUserDisplayName(user)}
												url={user.image}
											/>
											<span className="truncate">
												{getUserDisplayName(user)}
											</span>
										</div>
										<Check
											className={cn(
												"ml-auto h-4 w-4",
												value.includes(user.id) ? "opacity-100" : "opacity-0"
											)}
										/>
									</CommandItem>
								))}
							</CommandGroup>
						</CommandList>
					</Command>
				</PopoverContent>
			</Popover>

			{selectedUsers.length > 0 && (
				<div className="flex flex-wrap gap-1">
					{selectedUsers.map((user) => (
						<Badge
							className="h-7 gap-1 pr-0.5 pl-1"
							key={user.id}
							variant="secondary"
						>
							<Avatar
								className="size-5"
								fallbackName={getUserDisplayName(user)}
								url={user.image}
							/>
							<span className="text-xs">{getUserDisplayName(user)}</span>
							<Button
								className="h-5 w-5 p-0 hover:bg-transparent"
								disabled={disabled}
								onClick={() => removeUser(user.id)}
								size="sm"
								variant="ghost"
							>
								<X className="h-3 w-3" />
								<span className="sr-only">
									Remove {getUserDisplayName(user)}
								</span>
							</Button>
						</Badge>
					))}
				</div>
			)}
		</div>
	);
}
