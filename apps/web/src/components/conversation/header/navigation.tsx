import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icons";
import { TooltipOnHover } from "@/components/ui/tooltip";

export type ConversationHeaderNavigationProps = {
	onGoBack: () => void;
	onNavigateToPrevious: () => void;
	onNavigateToNext: () => void;
	hasPreviousConversation: boolean;
	hasNextConversation: boolean;
	selectedConversationIndex: number;
	totalOpenConversations: number;
};

export function ConversationHeaderNavigation({
	onGoBack,
	onNavigateToPrevious,
	onNavigateToNext,
	hasPreviousConversation,
	hasNextConversation,
	selectedConversationIndex,
	totalOpenConversations,
}: ConversationHeaderNavigationProps) {
	return (
		<div className="flex items-center gap-4">
			<TooltipOnHover content="Go back" shortcuts={["Esc"]}>
				<Button onClick={onGoBack} size="icon-small" variant="ghost">
					<Icon name="arrow-left" />
				</Button>
			</TooltipOnHover>
			<div className="flex items-center gap-2">
				<TooltipOnHover content="Previous conversation" shortcuts={["j"]}>
					<Button
						disabled={!hasPreviousConversation}
						onClick={onNavigateToPrevious}
						size="icon-small"
						variant="outline"
					>
						<Icon className="rotate-90" name="arrow-left" />
					</Button>
				</TooltipOnHover>
				<TooltipOnHover content="Next conversation" shortcuts={["k"]}>
					<Button
						disabled={!hasNextConversation}
						onClick={onNavigateToNext}
						size="icon-small"
						variant="outline"
					>
						<Icon className="rotate-90" name="arrow-right" />
					</Button>
				</TooltipOnHover>
			</div>
			<div className="flex gap-0.5 text-primary/40 text-sm">
				<span className="text-primary/90">{selectedConversationIndex + 1}</span>
				<span>/</span>
				<span>{totalOpenConversations}</span>
			</div>
		</div>
	);
}
