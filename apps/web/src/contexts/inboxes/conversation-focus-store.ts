import { create } from "zustand";

type ConversationFocusStore = {
	focusedConversationId: string | null;
	shouldRestoreFocus: boolean;
	setFocusedConversationId: (id: string | null) => void;
	clearFocus: () => void;
	markFocusRestored: () => void;
};

export const useConversationFocusStore = create<ConversationFocusStore>(
	(set) => ({
		focusedConversationId: null,
		shouldRestoreFocus: false,
		setFocusedConversationId: (id) =>
			set({ focusedConversationId: id, shouldRestoreFocus: true }),
		clearFocus: () =>
			set({ focusedConversationId: null, shouldRestoreFocus: false }),
		markFocusRestored: () => set({ shouldRestoreFocus: false }),
	})
);
