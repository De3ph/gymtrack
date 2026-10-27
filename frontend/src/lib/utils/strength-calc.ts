/** Minimal strength-calc helpers for 1-rep-max estimation. */

export const REP_CAP = 12;

/**
 * Estimated one-rep max from a set taken to `reps` reps at `weight`.
 *
 * Unit-agnostic: feed it kg and it returns kg, feed it lbs and it returns lbs.
 * Displaying the unit is the caller's job.
 *
 * Returns null when the inputs are out of range (weight <= 0, or reps outside
 * 1..REP_CAP), where the formulas stop being meaningful.
 */
export function estimate1RM(weight: number, reps: number): number | null {
  if (weight <= 0 || reps < 1 || reps > REP_CAP) return null;
  if (reps === 1) return weight;

  const epley = weight * (1 + reps / 30);
  const brzycki = weight * (36 / (37 - reps));

  return Math.round(((epley + brzycki) / 2) * 10) / 10;
}
