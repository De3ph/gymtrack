import { Skeleton } from "@/components/ui/skeleton";

/**
 * Grid-shaped placeholder for the exercise library.
 *
 * Mirrors the card's real proportions (media block, then text) so the grid does
 * not reflow when data lands — a single centred spinner would collapse the
 * layout and then push every tile down.
 */
export function ExerciseLibrarySkeleton({ count = 9 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      aria-hidden="true"
    >
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="flex flex-col border border-border">
          <Skeleton className="aspect-[4/3] w-full rounded-none" />
          <div className="space-y-3 px-4 py-4">
            <Skeleton className="h-4 w-3/4 rounded-none" />
            <Skeleton className="h-3 w-1/3 rounded-none" />
            <Skeleton className="h-3 w-full rounded-none" />
            <Skeleton className="h-3 w-5/6 rounded-none" />
          </div>
        </div>
      ))}
    </div>
  );
}