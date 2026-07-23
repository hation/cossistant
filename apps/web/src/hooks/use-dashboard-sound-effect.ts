import { useCallback, useEffect, useRef, useState } from "react";

export type UseDashboardSoundEffectOptions = {
	loop?: boolean;
	volume?: number;
	playbackRate?: number;
};

export type UseDashboardSoundEffectReturn = {
	play: () => void;
	stop: () => void;
	isPlaying: boolean;
	isLoading: boolean;
	error: Error | null;
};

/**
 * Hook to play sound effects using the Web Audio API for dashboard.
 *
 * @param soundPath - Path to the sound file in the public directory
 * @param options - Configuration options for the sound
 * @returns Object with play, stop functions and state
 */
export function useDashboardSoundEffect(
	soundPath: string,
	options: UseDashboardSoundEffectOptions = {}
): UseDashboardSoundEffectReturn {
	const { loop = false, volume = 1.0, playbackRate = 1.0 } = options;

	const [isPlaying, setIsPlaying] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<Error | null>(null);

	const audioContextRef = useRef<AudioContext | null>(null);
	const audioBufferRef = useRef<AudioBuffer | null>(null);
	const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
	const gainNodeRef = useRef<GainNode | null>(null);

	// Initialize audio context and load sound
	useEffect(() => {
		let mounted = true;

		const initAudio = async () => {
			try {
				// Create audio context if it doesn't exist
				if (!audioContextRef.current) {
					audioContextRef.current = new (
						window.AudioContext ||
						(
							window as typeof window & {
								webkitAudioContext?: typeof AudioContext;
							}
						).webkitAudioContext
					)();
				}

				// Load the audio file
				const response = await fetch(soundPath);
				if (!response.ok) {
					throw new Error(`Failed to load sound: ${response.statusText}`);
				}

				const arrayBuffer = await response.arrayBuffer();
				const audioBuffer =
					await audioContextRef.current.decodeAudioData(arrayBuffer);

				if (mounted) {
					audioBufferRef.current = audioBuffer;
					setIsLoading(false);
				}
			} catch (err) {
				if (mounted) {
					setError(
						err instanceof Error ? err : new Error("Failed to load sound")
					);
					setIsLoading(false);
				}
			}
		};

		initAudio();

		return () => {
			mounted = false;
		};
	}, [soundPath]);

	// Play sound
	const play = useCallback(() => {
		const audioContext = audioContextRef.current;
		const audioBuffer = audioBufferRef.current;

		const canPlay = audioContext && audioBuffer && !isLoading && !error;

		if (!canPlay) {
			return;
		}

		// Stop any currently playing sound
		if (sourceNodeRef.current) {
			try {
				sourceNodeRef.current.stop();
			} catch {
				// Ignore errors if already stopped
			}
		}

		// Create new source node
		const source = audioContext.createBufferSource();
		source.buffer = audioBuffer;
		source.loop = loop;
		source.playbackRate.value = playbackRate;

		// Create gain node for volume control
		const gainNode = audioContext.createGain();
		gainNode.gain.value = volume;

		// Connect nodes: source -> gain -> destination
		source.connect(gainNode);
		gainNode.connect(audioContext.destination);

		// Store references
		sourceNodeRef.current = source;
		gainNodeRef.current = gainNode;

		// Handle end event
		source.onended = () => {
			if (!loop) {
				setIsPlaying(false);
			}
		};

		// Start playback
		source.start(0);
		setIsPlaying(true);
	}, [loop, volume, playbackRate, isLoading, error]);

	// Stop sound
	const stop = useCallback(() => {
		if (sourceNodeRef.current) {
			try {
				sourceNodeRef.current.stop();
				sourceNodeRef.current.disconnect();
			} catch {
				// Ignore errors if already stopped
			}
			sourceNodeRef.current = null;
		}
		setIsPlaying(false);
	}, []);

	// Cleanup on unmount
	useEffect(
		() => () => {
			stop();
		},
		[stop]
	);

	return {
		play,
		stop,
		isPlaying,
		isLoading,
		error,
	};
}
