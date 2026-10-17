import { describe, it, expect } from "vitest";
import { getPaginationRange } from "@/lib/pagination";

describe("getPaginationRange", () => {
  it("returns every page when the total fits the window", () => {
    expect(getPaginationRange(1, 1)).toEqual([1]);
    expect(getPaginationRange(3, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(getPaginationRange(7, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("anchors first and last page and windows the middle", () => {
    expect(getPaginationRange(1, 50)).toEqual([1, 2, 3, 4, 5, "ellipsis", 50]);
    expect(getPaginationRange(25, 50)).toEqual([
      1,
      "ellipsis",
      24,
      25,
      26,
      "ellipsis",
      50,
    ]);
    expect(getPaginationRange(50, 50)).toEqual([1, "ellipsis", 46, 47, 48, 49, 50]);
  });

  it("windows on the correct side near the edges", () => {
    expect(getPaginationRange(2, 50)).toEqual([1, 2, 3, 4, 5, "ellipsis", 50]);
    expect(getPaginationRange(48, 50)).toEqual([1, "ellipsis", 46, 47, 48, 49, 50]);
  });

  it("never renders more than siblingCount * 2 + 5 items for large totals", () => {
    for (const page of [1, 2, 13, 50, 99, 100]) {
      const range = getPaginationRange(page, 100);
      expect(range.length).toBeLessThanOrEqual(7);
      expect(range[0]).toBe(1);
      expect(range[range.length - 1]).toBe(100);
      expect(range).toContain(page);
    }
  });

  it("clamps out-of-range and non-finite pages", () => {
    expect(getPaginationRange(0, 50)).toEqual(getPaginationRange(1, 50));
    expect(getPaginationRange(999, 50)).toEqual(getPaginationRange(50, 50));
    expect(getPaginationRange(Number.NaN, 50)).toEqual(getPaginationRange(1, 50));
  });

  it("treats invalid totals as a single page", () => {
    expect(getPaginationRange(3, 0)).toEqual([1]);
    expect(getPaginationRange(3, Number.NaN)).toEqual([1]);
  });
});
