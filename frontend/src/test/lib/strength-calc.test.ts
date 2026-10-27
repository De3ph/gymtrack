import { describe, it, expect } from "vitest";
import { estimate1RM, REP_CAP } from "@/lib/utils/strength-calc";

describe("estimate1RM", () => {
  it("returns the weight itself for a single rep", () => {
    expect(estimate1RM(100, 1)).toBe(100);
  });

  it("averages the Epley and Brzycki estimates for multi-rep sets", () => {
    // Epley: 100 * (1 + 5/30) = 116.67
    // Brzycki: 100 * (36 / 32) = 112.5
    // Average: 114.58 -> rounded to one decimal
    expect(estimate1RM(100, 5)).toBe(114.6);
  });

  it("rejects a non-positive weight", () => {
    expect(estimate1RM(0, 5)).toBeNull();
    expect(estimate1RM(-10, 5)).toBeNull();
  });

  it("rejects reps below one", () => {
    expect(estimate1RM(100, 0)).toBeNull();
    expect(estimate1RM(100, -3)).toBeNull();
  });

  it("accepts the rep cap and rejects one rep beyond it", () => {
    expect(estimate1RM(100, REP_CAP)).not.toBeNull();
    expect(estimate1RM(100, REP_CAP + 1)).toBeNull();
  });

  it("scales linearly with the input weight", () => {
    const single = estimate1RM(100, 8);
    const double = estimate1RM(200, 8);
    expect(single).not.toBeNull();
    expect(double).not.toBeNull();
    expect((double as number) / (single as number)).toBeCloseTo(2, 5);
  });

  it("rounds to a single decimal place", () => {
    const result = estimate1RM(83.5, 7);
    expect(result).not.toBeNull();
    expect(Number.isInteger((result as number) * 10)).toBe(true);
  });
});
