import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export const CONVERSATION_DEVELOPER_MODE_HOTKEY = "mod+shift+d";
export const CONVERSATION_DEVELOPER_MODE_SHORTCUT_CHIPS = [
	"mod",
	"shift",
	"d",
] as const;

type ConversationDeveloperModeState = {
	isDeveloperModeEnabled: boolean;
	setDeveloperModeEnabled: (next: boolean) => void;
	toggleDeveloperMode: () => void;
};

export const useConversationDeveloperMode =
	create<ConversationDeveloperModeState>()(
		persist(
			(set) => ({
				isDeveloperModeEnabled: false,
				setDeveloperModeEnabled: (next) =>
					set({ isDeveloperModeEnabled: next }),
				toggleDeveloperMode: () =>
					set((state) => ({
						isDeveloperModeEnabled: !state.isDeveloperModeEnabled,
					})),
			}),
			{
				name: "conversation-developer-mode",
				storage: createJSONStorage(() => localStorage),
			}
		)
	);
