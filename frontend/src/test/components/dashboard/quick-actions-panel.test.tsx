import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";

import { QuickActionsPanel } from "@/components/features/dashboard/QuickActionsPanel";
import { ROUTES } from "@/lib/routes";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push,
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/",
}));

// jsdom does not implement the Web Animations API used by the glow card.
beforeAll(() => {
  if (!Element.prototype.animate) {
    Element.prototype.animate = function animate() {
      return { cancel: vi.fn(), finish: vi.fn() } as unknown as Animation;
    };
  }
});

afterEach(() => {
  cleanup();
  push.mockClear();
});

describe("QuickActionsPanel", () => {
  it("renders the three quick actions with their translated labels", () => {
    render(<QuickActionsPanel />);

    expect(screen.getByText("Log workout")).toBeInTheDocument();
    expect(screen.getByText("Log meal")).toBeInTheDocument();
    expect(screen.getByText("Open calendar")).toBeInTheDocument();
  });

  it("renders each action as a glow card", () => {
    const { container } = render(<QuickActionsPanel />);

    expect(container.querySelectorAll(".spotlight-card")).toHaveLength(3);
  });

  it("renders each action as an accessible button", () => {
    render(<QuickActionsPanel />);

    const buttons = screen.getAllByRole("button");

    expect(buttons).toHaveLength(3);
    buttons.forEach((button) => {
      expect(button).toHaveAttribute("tabindex", "0");
    });
  });

  it("navigates to the workouts page when the workout action is clicked", () => {
    render(<QuickActionsPanel />);

    fireEvent.click(screen.getByText("Log workout"));

    expect(push).toHaveBeenCalledWith(ROUTES.ATHLETE_WORKOUTS);
  });

  it("navigates to the meals page when the meal action is clicked", () => {
    render(<QuickActionsPanel />);

    fireEvent.click(screen.getByText("Log meal"));

    expect(push).toHaveBeenCalledWith(ROUTES.ATHLETE_MEALS);
  });

  it("navigates to the workouts page when the calendar action is clicked", () => {
    render(<QuickActionsPanel />);

    fireEvent.click(screen.getByText("Open calendar"));

    expect(push).toHaveBeenCalledWith(ROUTES.ATHLETE_WORKOUTS);
  });
});
