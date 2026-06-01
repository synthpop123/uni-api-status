import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Merges Tailwind CSS classes using clsx and tailwind-merge.
 * Handles conditional classes and prevents style conflicts.
 * @param inputs - Class values to merge (strings, objects, arrays).
 * @returns A string of combined and optimized class names.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
