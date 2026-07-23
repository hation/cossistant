import { useEffect } from "react";
import { useDashboardSoundEffect } from "./use-dashboard-sound-effect";

/**
 * Hook to play a looping typing sound while someone is typing in the dashboard.
 *
 * @param isTyping - Whether someone is currently typing
 * @param enabled - Whether the sound is enabled in user preferences
 * @param options - Optional configuration for volume and playback speed
 */
export function useDashboardTypingSound(
	isTyping: boolean,
	enabled: boolean,
	options?: { volume?: number; playbackRate?: number }
): void {
	const { play, stop, isPlaying } = useDashboardSoundEffect(
		"/sounds/typing-loop.wav",
		{
			loop: true,
			volume: options?.volume ?? 1.0,
			playbackRate: options?.playbackRate ?? 1.0,
		}
	);

	useEffect(() => {
		if (enabled && isTyping && !isPlaying) {
			play();
		} else if (!(enabled && isTyping) && isPlaying) {
			stop();
		}
	}, [enabled, isTyping, isPlaying, play, stop]);

	// Cleanup on unmount
	useEffect(
		() => () => {
			stop();
		},
		[stop]
	);
}
