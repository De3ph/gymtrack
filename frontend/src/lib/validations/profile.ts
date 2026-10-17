/**
 * Shared rules for the athlete profile's numeric fields.
 *
 * Pure by design: no `t()`, no React, no framework imports. Each form maps the
 * returned error to a translated message at the call site, so these bounds stay
 * unit-testable and reusable outside a component.
 *
 * The backend stores Age/Weight/Height as `int` (models.UserProfile), so a
 * decimal must be rejected rather than silently truncated.
 */

/**
 * Declared as a type alias rather than an interface so it stays assignable to
 * next-intl's ICU message-values parameter (implicit index signature).
 */
export type IntRange = {
  min: number;
  max: number;
};

export interface OptionalIntResult {
  /** Parsed value, or `undefined` when blank - which means "clear this field". */
  value: number | undefined;
  /** Non-null when a non-blank input is not a whole number within range. */
  error: "out_of_range" | null;
}

export const PROFILE_RANGES = {
  age: { min: 13, max: 120 },
  weight: { min: 20, max: 500 },
  height: { min: 50, max: 300 },
} as const satisfies Record<string, IntRange>;

export function parseOptionalInt(raw: string, range: IntRange): OptionalIntResult {
  const trimmed = raw.trim();

  // Blank clears the field. `undefined` is dropped by JSON.stringify, which is
  // how a cleared value reaches the Go handler as a zero value.
  if (trimmed === "") {
    return { value: undefined, error: null };
  }

  const parsed = Number(trimmed);

  if (!Number.isInteger(parsed) || parsed < range.min || parsed > range.max) {
    return { value: undefined, error: "out_of_range" };
  }

  return { value: parsed, error: null };
}

/**
 * For inline TanStack validators: returns ICU message params when the value is
 * invalid, or `undefined` when it passes. Pair it with `parseOptionalInt` in the
 * form's `onSubmit` so validation and parsing can never disagree.
 */
export function checkOptionalInt(raw: string, range: IntRange): IntRange | undefined {
  return parseOptionalInt(raw, range).error ? range : undefined;
}