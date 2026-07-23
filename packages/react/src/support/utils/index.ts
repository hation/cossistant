import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Tailwind-aware class name merger used across support components.
 */
export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}
