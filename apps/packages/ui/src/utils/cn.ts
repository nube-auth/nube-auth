import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility function to merge Tailwind CSS classes
 * Combines clsx for conditional classes with tailwind-merge to resolve conflicts
 *
 * Usage:
 * ```tsx
 * cn("px-2 py-1", "px-4") // Returns "py-1 px-4" (px-4 overwrites px-2)
 * cn("px-2", { "py-1": true, "py-2": false }) // Returns "px-2 py-1"
 * ```
 */
export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}
