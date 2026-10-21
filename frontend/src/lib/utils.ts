import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * The type scale is Tailwind's own (`text-3xl`, `text-base`, `text-sm`, …) with
 * `font-medium` supplying the 500 weight the utilities don't carry. No custom
 * font-size tokens are registered here, so tailwind-merge's built-in class
 * groups already keep size and color independent.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
