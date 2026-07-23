import { useEffect, useRef } from "react";

type ScheduledTask = {
	id: number;
	scheduledTime: number;
	callback: () => void;
	pausedAt: number | null;
	remainingTime: number;
};

type UseAnimationSchedulerProps = {
	isPlaying: boolean;
	onComplete?: () => void;
};

/**
 * Reusable hook for scheduling animation callbacks at specific times.
 * Handles pause/resume functionality and automatic cleanup.
 *
 * @param isPlaying - Whether the animation should be playing
 * @param onComplete - Optional callback when all scheduled tasks complete
 * @returns schedule function to schedule callbacks at specific times
 */
export function useAnimationScheduler({
	isPlaying,
	onComplete,
}: UseAnimationSchedulerProps) {
	const tasksRef = useRef<Map<number, ScheduledTask>>(new Map());
	const timeoutsRef = useRef<Map<number, NodeJS.Timeout>>(new Map());
	const taskIdCounterRef = useRef(0);
	const startTimeRef = useRef<number | null>(null);
	const pauseTimeRef = useRef<number | null>(null);
	const elapsedBeforePauseRef = useRef(0);

	// Cleanup all timeouts on unmount
	useEffect(
		() => () => {
			for (const timeout of timeoutsRef.current.values()) {
				clearTimeout(timeout);
			}
			timeoutsRef.current.clear();
			tasksRef.current.clear();
		},
		[]
	);

	// Handle play/pause state changes
	useEffect(() => {
		if (isPlaying) {
			// Resuming from pause
			if (pauseTimeRef.current !== null && startTimeRef.current !== null) {
				const pauseDuration = Date.now() - pauseTimeRef.current;
				elapsedBeforePauseRef.current += pauseDuration;
				pauseTimeRef.current = null;

				// Reschedule all remaining tasks
				const now = Date.now();
				const adjustedStartTime =
					startTimeRef.current + elapsedBeforePauseRef.current;

				for (const [id, task] of tasksRef.current.entries()) {
					if (task.pausedAt !== null) {
						const adjustedScheduledTime =
							adjustedStartTime + (task.scheduledTime - startTimeRef.current);
						const remainingTime = Math.max(0, adjustedScheduledTime - now);

						// Clear old timeout if exists
						const oldTimeout = timeoutsRef.current.get(id);
						if (oldTimeout) {
							clearTimeout(oldTimeout);
						}

						// Schedule new timeout
						const timeout = setTimeout(() => {
							task.callback();
							tasksRef.current.delete(id);
							timeoutsRef.current.delete(id);

							// Check if all tasks are complete
							if (tasksRef.current.size === 0 && onComplete) {
								onComplete();
							}
						}, remainingTime);

						timeoutsRef.current.set(id, timeout);
						task.pausedAt = null;
						task.remainingTime = remainingTime;
					}
				}
			} else if (startTimeRef.current === null) {
				// Starting fresh
				startTimeRef.current = Date.now();
				elapsedBeforePauseRef.current = 0;
			}
		} else if (startTimeRef.current !== null && pauseTimeRef.current === null) {
			// Pausing
			pauseTimeRef.current = Date.now();

			// Cancel all active timeouts and store remaining time
			for (const [id, timeout] of timeoutsRef.current.entries()) {
				clearTimeout(timeout);
				const task = tasksRef.current.get(id);
				if (!task) {
					continue;
				}
				const now = Date.now();
				const adjustedStartTime =
					startTimeRef.current + elapsedBeforePauseRef.current;
				const elapsed = now - adjustedStartTime;
				task.pausedAt = now;
				task.remainingTime = task.scheduledTime - elapsed;
			}
			timeoutsRef.current.clear();
		}
	}, [isPlaying, onComplete]);

	/**
	 * Schedule a callback to execute after a specified delay from the start of the animation.
	 *
	 * @param timeMs - Time in milliseconds from animation start (not from now)
	 * @param callback - Function to execute at the scheduled time
	 * @returns A function to cancel this scheduled task
	 */
	const schedule = (timeMs: number, callback: () => void): (() => void) => {
		const taskId = taskIdCounterRef.current++;
		const now = Date.now();

		// Initialize start time if not set
		if (startTimeRef.current === null) {
			startTimeRef.current = now;
			elapsedBeforePauseRef.current = 0;
		}

		// Calculate when this task should execute
		const adjustedStartTime =
			startTimeRef.current + elapsedBeforePauseRef.current;
		const scheduledTime = adjustedStartTime + timeMs;
		const delay = Math.max(0, scheduledTime - now);

		const task: ScheduledTask = {
			id: taskId,
			scheduledTime,
			callback,
			pausedAt: null,
			remainingTime: delay,
		};

		tasksRef.current.set(taskId, task);

		// Only schedule if playing
		if (isPlaying && pauseTimeRef.current === null) {
			const timeout = setTimeout(() => {
				callback();
				tasksRef.current.delete(taskId);
				timeoutsRef.current.delete(taskId);

				// Check if all tasks are complete
				if (tasksRef.current.size === 0 && onComplete) {
					onComplete();
				}
			}, delay);

			timeoutsRef.current.set(taskId, timeout);
		}

		// Return cancel function
		return () => {
			const timeout = timeoutsRef.current.get(taskId);
			if (timeout) {
				clearTimeout(timeout);
				timeoutsRef.current.delete(taskId);
			}
			tasksRef.current.delete(taskId);
		};
	};

	/**
	 * Reset the scheduler, clearing all tasks and resetting state.
	 */
	const reset = () => {
		for (const timeout of timeoutsRef.current.values()) {
			clearTimeout(timeout);
		}
		timeoutsRef.current.clear();
		tasksRef.current.clear();
		startTimeRef.current = null;
		pauseTimeRef.current = null;
		elapsedBeforePauseRef.current = 0;
	};

	return { schedule, reset };
}
