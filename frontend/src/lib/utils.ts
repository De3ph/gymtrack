import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

/**
 * The type scale lives in globals.css as named `text-*` tokens
 * (`text-heading-xl`, `text-caption-sm`, …). tailwind-merge cannot tell those
 * apart from a text *color*, so it drops them whenever the same element also
 * sets `text-muted-foreground`/`text-foreground`. Registering the names in the
 * font-size group keeps size and color independent — otherwise a primitive
 * that already sets `text-sm` silently wins over the token.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: [
            "heading-xl",
            "heading-lg",
            "heading-md",
            "body",
            "body-strong",
            "button-sm",
            "caption",
            "caption-sm",
            "utility",
            "link",
          ],
        },
      ],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
