/**
 * Pagination windowing.
 *
 * Lists used to render one PaginationLink per page
 * (Array.from({ length: totalPages })). With large totals (e.g. the admin
 * row budget) that produces hundreds of links. getPaginationRange returns a
 * bounded slice around the current page instead:
 *
 *   page 1 of 50   -> [1, 2, 3, 4, 5, "ellipsis", 50]
 *   page 25 of 50  -> [1, "ellipsis", 24, 25, 26, "ellipsis", 50]
 *   page 48 of 50  -> [1, "ellipsis", 46, 47, 48, 49, 50]
 *
 * When everything fits (totalPages <= siblingCount * 2 + 5) every page is
 * returned, so small lists keep their current look.
 */

export const PAGINATION_ELLIPSIS = "ellipsis" as const;

export type PaginationRangeItem = number | typeof PAGINATION_ELLIPSIS;

function range(start: number, end: number): number[] {
  const items: number[] = [];
  for (let i = start; i <= end; i += 1) items.push(i);
  return items;
}

/**
 * @param currentPage 1-based page currently displayed (clamped into range)
 * @param totalPages  total number of pages (minimum 1)
 * @param siblingCount pages shown on each side of the current page
 */
export function getPaginationRange(
  currentPage: number,
  totalPages: number,
  siblingCount = 1,
): PaginationRangeItem[] {
  const total = Number.isFinite(totalPages) ? Math.max(1, Math.trunc(totalPages)) : 1;
  const page = Number.isFinite(currentPage)
    ? Math.min(Math.max(1, Math.trunc(currentPage)), total)
    : 1;

  // first + last + current + siblings + room for two ellipses
  const maxVisible = siblingCount * 2 + 5;
  if (total <= maxVisible) return range(1, total);

  const left = Math.max(page - siblingCount, 1);
  const right = Math.min(page + siblingCount, total);

  const showLeftEllipsis = left > 2;
  const showRightEllipsis = right < total - 1;

  // Pages near the start: one gap after the window, before the last page.
  if (!showLeftEllipsis && showRightEllipsis) {
    return [...range(1, siblingCount * 2 + 3), PAGINATION_ELLIPSIS, total];
  }

  // Pages near the end: one gap before the window, after the first page.
  if (showLeftEllipsis && !showRightEllipsis) {
    return [1, PAGINATION_ELLIPSIS, ...range(total - (siblingCount * 2 + 3) + 1, total)];
  }

  // Middle: gap on both sides of the window.
  return [1, PAGINATION_ELLIPSIS, ...range(left, right), PAGINATION_ELLIPSIS, total];
}
