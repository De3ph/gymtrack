/**
 * Accepts a comma decimal separator. Turkish keyboards emit "75,5", and
 * `Number("75,5")` is NaN — which would have shown a validation error on a
 * perfectly valid entry.
 */
function normalizeNumeric(value: string): string {
  return value.trim().replace(",", ".");
}

/** Parsed value, or `null` when the field is blank or not a finite number. */
export function parseNumeric(value: string): number | null {
  const raw = normalizeNumeric(value);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}
