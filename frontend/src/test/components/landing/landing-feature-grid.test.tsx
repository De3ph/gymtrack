import { describe, it, expect, beforeAll } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { LandingFeatureGrid } from "@/components/features/landing/LandingFeatureGrid";

beforeAll(() => {
  // jsdom has no matchMedia; useReducedMotion reads it via useSyncExternalStore.
  if (!window.matchMedia) {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: (query: string) => ({
        matches: true, // reduced motion: keeps the reveal variants inert
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }),
    });
  }
});

describe("LandingFeatureGrid", () => {
  it("renders one row per logged domain", () => {
    render(<LandingFeatureGrid />);

    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(4);
    expect(within(items[0]).getByText("Workout tracking")).toBeInTheDocument();
    expect(within(items[3]).getByText("Trainer connection")).toBeInTheDocument();
  });

  it("shows the live stat but no Output block", () => {
    render(<LandingFeatureGrid />);

    expect(screen.getByText("+12% this week")).toBeInTheDocument();
    expect(screen.getByText("2,340 kcal today")).toBeInTheDocument();
    expect(screen.queryByText("Output")).not.toBeInTheDocument();
    expect(screen.queryByText("Sets logged")).not.toBeInTheDocument();
    expect(screen.queryByText("Macros tracked")).not.toBeInTheDocument();
  });

  it("renders the sample record card", () => {
    render(<LandingFeatureGrid />);

    expect(screen.getByText("Bench Press")).toBeInTheDocument();
    expect(screen.getByText("Push Day")).toBeInTheDocument();
    expect(screen.getByText("4 × 8 @ 185 lbs")).toBeInTheDocument();
  });
});
