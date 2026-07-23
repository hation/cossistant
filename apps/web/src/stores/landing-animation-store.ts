import { create } from "zustand";

export type LandingAnimationView = "inbox" | "conversation";

type LandingAnimationState = {
	currentView: LandingAnimationView | null;
	isPlaying: boolean;
	isRestarting: boolean;
	play: () => void;
	pause: () => void;
	selectView: (view: LandingAnimationView) => void;
	onAnimationComplete: () => void;
	reset: () => void;
	restart: () => void;
};

/**
 * Store for controlling landing page animations.
 * Designed to be extensible for future animations.
 */
export const useLandingAnimationStore = create<LandingAnimationState>(
	(set, get) => ({
		currentView: "inbox",
		isPlaying: true,
		isRestarting: false,

		play: () => {
			const { isPlaying, currentView } = get();
			// If stopped at the end (not playing, on inbox), trigger restart
			if (!isPlaying && currentView === "inbox") {
				get().restart();
			} else {
				set({ isPlaying: true });
			}
		},

		pause: () => {
			set({ isPlaying: false });
		},

		selectView: (view: LandingAnimationView) => {
			set({ currentView: view, isPlaying: true });
		},

		onAnimationComplete: () => {
			const { currentView, isPlaying } = get();

			// Only auto-switch if playing (don't switch if paused)
			if (!isPlaying) {
				return;
			}

			// inbox -> conversation (then stop and reset to beginning)
			if (currentView === "inbox") {
				set({ currentView: "conversation", isPlaying: true });
			} else if (currentView === "conversation") {
				// Animation complete - stop and reset to beginning (inbox)
				// User can click play to restart from the beginning
				set({ currentView: "inbox", isPlaying: false });
			}
		},

		reset: () => {
			set({ currentView: "inbox", isPlaying: true });
		},

		restart: () => {
			// Set restarting flag and stop playing
			set({ isRestarting: true, isPlaying: false, currentView: "inbox" });

			// After a 4 second delay, start playing again
			setTimeout(() => {
				set({ isRestarting: false, isPlaying: true });
			}, 4000);
		},
	})
);
