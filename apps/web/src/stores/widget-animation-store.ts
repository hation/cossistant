import { create } from "zustand";

export type WidgetAnimationView = "home" | "conversation";

type WidgetAnimationState = {
	currentView: WidgetAnimationView | null;
	isPlaying: boolean;
	isRestarting: boolean;
	play: () => void;
	pause: () => void;
	selectView: (view: WidgetAnimationView) => void;
	onAnimationComplete: () => void;
	reset: () => void;
	restart: () => void;
};

/**
 * Store for controlling widget landing animation.
 * Separate from landing-animation-store to avoid interference.
 */
export const useWidgetAnimationStore = create<WidgetAnimationState>(
	(set, get) => ({
		currentView: "home",
		isPlaying: true,
		isRestarting: false,

		play: () => {
			const { isPlaying, currentView } = get();
			// If stopped at the end (not playing, on home), trigger restart
			if (!isPlaying && currentView === "home") {
				get().restart();
			} else {
				set({ isPlaying: true });
			}
		},

		pause: () => {
			set({ isPlaying: false });
		},

		selectView: (view: WidgetAnimationView) => {
			set({ currentView: view, isPlaying: true });
		},

		onAnimationComplete: () => {
			const { currentView, isPlaying } = get();

			// Only auto-switch if playing (don't switch if paused)
			if (!isPlaying) {
				return;
			}

			// home -> conversation (handled by mouse click)
			// conversation -> complete and restart after delay
			if (currentView === "conversation") {
				// Animation complete - restart after delay
				get().restart();
			}
		},

		reset: () => {
			set({ currentView: "home", isPlaying: true });
		},

		restart: () => {
			// Set restarting flag and stop playing
			set({ isRestarting: true, isPlaying: false, currentView: "home" });

			// After a 10 second delay, start playing again
			setTimeout(() => {
				set({ isRestarting: false, isPlaying: true });
			}, 10_000);
		},
	})
);
