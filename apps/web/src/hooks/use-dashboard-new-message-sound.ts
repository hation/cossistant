import { useCallback } from "react";
import { useDashboardSoundEffect } from "./use-dashboard-sound-effect";

/**
 * Hook to play a sound when a new message arrives in the dashboard.
 *
 * @param enabled - Whether the sound is enabled in user preferences
 * @param options - Optional configuration for volume and playback speed
 * @returns Function to play the new message sound
 */
export function useDashboardNewMessageSound(
	enabled: boolean,
	options?: { volume?: number; playbackRate?: number }
): () => void {
	const { play } = useDashboardSoundEffect("/sounds/new-message.wav", {
		loop: false,
		volume: options?.volume ?? 1.0,
		playbackRate: options?.playbackRate ?? 1.0,
	});

	return useCallback(() => {
		if (enabled) {
			play();
		}
	}, [enabled, play]);
}
