import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ExercisesClient } from "@/app/[locale]/(dashboard)/exercises/_components/ExercisesClient";
import {
  exerciseCardReveal,
  exerciseReveal,
} from "@/components/features/exercise/exercise-variants";
import type { Equipment, ExerciseLibrary, MuscleGroup } from "@/types";

// The component reads the window out of the URL on mount; there is no Next.js
// request scope in Vitest, so the router surface is stubbed.
vi.mock("next/navigation", () => ({
  usePathname: () => "/en/exercises",
  useSearchParams: () => new URLSearchParams(),
}));

const GRID_ID = "exercise-library-grid";
const BATCH_SIZE = 48;

const muscleGroups: MuscleGroup[] = [{ id: 1, code: "chest", description: "Chest" }];
const equipment: Equipment[] = [{ id: 1, code: "barbell", description: "Barbell" }];

function makeExercise(exerciseId: number, name: string): ExerciseLibrary {
  return {
    exerciseId,
    name,
    category: "strength",
    muscleGroupId: 1,
    equipmentId: 1,
    createdAt: "2026-01-01T00:00:00Z",
  };
}

/**
 * 130 rows split into two searchable groups, so a single keystroke can narrow
 * the catalog to more than one batch (proving the window resets) without
 * needing to drive a Base UI select.
 */
const exercises: ExerciseLibrary[] = [
  ...Array.from({ length: 60 }, (_, i) =>
    makeExercise(i + 1, `Push A${i + 1}`),
  ),
  ...Array.from({ length: 70 }, (_, i) =>
    makeExercise(61 + i, `Pull B${i + 1}`),
  ),
];

const renderLibrary = (catalog: ExerciseLibrary[] = exercises) =>
  render(
    <ExercisesClient
      exercises={catalog}
      muscleGroups={muscleGroups}
      equipment={equipment}
    />,
  );

/** Cards currently mounted, i.e. the size of the window. */
const mountedCards = () =>
  within(document.getElementById(GRID_ID)!).getAllByRole("link");

const loadMoreButton = () =>
  screen.queryByRole("button", { name: /load more/i });

describe("ExercisesClient", () => {
  it("mounts only the first batch of a large catalog", () => {
    renderLibrary();

    expect(mountedCards()).toHaveLength(BATCH_SIZE);
    // The count line is the only cue that the grid is windowed.
    expect(screen.getByText("Showing 48 of 130 exercises")).toBeInTheDocument();
    expect(loadMoreButton()).toBeInTheDocument();
  });

  it("appends the next batch without navigating or resetting filters", () => {
    renderLibrary();

    fireEvent.click(loadMoreButton()!);

    expect(mountedCards()).toHaveLength(BATCH_SIZE * 2);
    expect(screen.getByText("Showing 96 of 130 exercises")).toBeInTheDocument();
    // Remaining cards are reported on the button itself.
    expect(loadMoreButton()).toHaveTextContent("+34");
  });

  it("drops the button once the whole result set is mounted", () => {
    renderLibrary();

    fireEvent.click(loadMoreButton()!);
    fireEvent.click(loadMoreButton()!);

    expect(mountedCards()).toHaveLength(130);
    expect(screen.getByText("130 exercises")).toBeInTheDocument();
    expect(loadMoreButton()).toBeNull();
  });

  it("resets the window when a filter narrows the result set", async () => {
    renderLibrary();
    fireEvent.click(loadMoreButton()!);
    expect(mountedCards()).toHaveLength(BATCH_SIZE * 2);

    fireEvent.change(screen.getByRole("searchbox", { name: "Search" }), {
      target: { value: "Push" },
    });

    // 60 matches are still more than one batch, so the window is back to 48
    // rather than to "everything that is left".
    await waitFor(() => expect(mountedCards()).toHaveLength(BATCH_SIZE));
    // Filtered *and* windowed, so both counts are reported.
    expect(
      screen.getByText("Showing 48 of 60 matching (130 total)"),
    ).toBeInTheDocument();
    expect(loadMoreButton()).toHaveTextContent("+12");
  });

  it("renders a small catalog in full with no windowing chrome", () => {
    renderLibrary(exercises.slice(0, 5));

    expect(mountedCards()).toHaveLength(5);
    expect(screen.getByText("5 exercises")).toBeInTheDocument();
    expect(loadMoreButton()).toBeNull();
  });
});

describe("exerciseCardReveal", () => {
  // Regression guard: a container-orchestrated stagger derives each child's
  // delay from its index, so an 870-row catalog held the last tile back for
  // ~26s and replayed the ramp on every appended batch.
  it("stops delaying cards after the first screen", () => {
    expect(exerciseCardReveal(200)).toBe(exerciseReveal);
  });

  it("steps the first cards by 30ms", () => {
    const variant = exerciseCardReveal(3);
    const transition = (variant.visible as { transition: { delay: number } })
      .transition;

    expect(transition.delay).toBeCloseTo(0.09);
  });
});
