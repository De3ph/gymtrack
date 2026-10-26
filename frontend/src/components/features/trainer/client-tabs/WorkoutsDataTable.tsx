"use client";

import * as React from "react";
import { useMemo } from "react";
import dynamic from "next/dynamic";
import {
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type ExpandedState,
  type PaginationState,
  type SortingState,
} from "@tanstack/react-table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";
import { formatDate } from "@/lib/i18n/dayjs";
import { useTranslations } from "next-intl";
import { PAGINATION } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Workout } from "@/types";
import { SetTypeBadge } from "@/components/features/workout/SetTypeBadge";

// ---------------------------------------------------------------------------
// Lazy-load the comment thread so trainer pages do not carry a large bundle
// ---------------------------------------------------------------------------
const CommentThread = dynamic(
  () =>
    import("@/components/features/comments/CommentThread").then((m) => m.CommentThread),
  { ssr: false, loading: () => <Skeleton className="h-12 w-full" /> },
);

// ---------------------------------------------------------------------------
// Shared sortable header
// ---------------------------------------------------------------------------

type SortableColumn = {
  getIsSorted: () => false | "asc" | "desc";
  toggleSorting: (desc?: boolean) => void;
};

interface SortableHeaderProps {
  label: string;
  column: SortableColumn;
}

function SortableHeader({ label, column }: SortableHeaderProps) {
  return (
    <button
      type="button"
      onClick={() => column.toggleSorting()}
      className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.18em]"
      aria-label={`Sort by ${label}`}
    >
      {label}
      {column.getIsSorted() === "asc" ? (
        <ChevronDownIcon className="size-4" />
      ) : column.getIsSorted() === "desc" ? (
        <ChevronDownIcon className="size-4 rotate-180" />
      ) : (
        <ChevronDownIcon className="-rotate-90 size-4 opacity-40" />
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Expanded row detail: exercises + sets chips + comments
// ---------------------------------------------------------------------------

function WorkoutRowDetail({ workout }: { workout: Workout }) {
  const tWorkout = useTranslations("workout.list");

  if (!workout.exercises?.length) {
    return (
      <div className="space-y-4 border-t border-border bg-muted/30 px-4 py-4 sm:px-6">
        <p className="text-xs text-muted-foreground">{tWorkout("no_sets")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 border-t border-border bg-muted/30 px-4 py-4 sm:px-6">
      {workout.exercises.map((exercise, index) => (
        <div key={index} className="space-y-1.5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
            <span className="font-semibold text-foreground">{exercise.name}</span>
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              {tWorkout("sets_x", { sets: exercise.sets?.length ?? 0 })}
            </span>
          </div>
          {exercise.sets && exercise.sets.length > 0 ? (
            <ul className="flex flex-wrap gap-2">
              {exercise.sets.map((set, s) => (
                <li
                  key={set.setId ?? s}
                  className="flex items-baseline gap-1.5 border border-border px-2.5 py-1 font-mono text-xs tabular-nums text-foreground"
                >
                  <span className="text-[10px] text-muted-foreground">{String(s + 1).padStart(2, "0")}</span>
                  <SetTypeBadge type={set.setType} />
                  {tWorkout("set_detail", {
                    reps: set.reps,
                    weight: set.weight,
                    unit: set.weightUnit || "kg",
                  })}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">{tWorkout("no_sets")}</p>
          )}
        </div>
      ))}

      <CommentThread targetType="workout" targetId={workout.workoutId} readOnly={false} enabled />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main data table
// ---------------------------------------------------------------------------

interface WorkoutsDataTableProps {
  workouts: Workout[];
  /** Pre-filter exercise name substring applied before TanStack columns */
  exerciseType?: string;
  /** When this changes the table resets page, filters and expansion */
  resetKey: string;
}

export function WorkoutsDataTable({
  workouts,
  exerciseType,
  resetKey,
}: WorkoutsDataTableProps) {
  const t = useTranslations("trainer.client_detail.tabs.workouts_table");

  // -----------------------------------------------------------------------
  // Client-side prefilter (fixes the bug where the parent bar only applies
  // to the current server-fetched page)
  // -----------------------------------------------------------------------
  const filteredWorkouts = React.useMemo(() => {
    if (!exerciseType) return workouts;
    const needle = exerciseType.toLowerCase();
    return workouts.filter((w) =>
      w.exercises.some((e) => e.name.toLowerCase().includes(needle)),
    );
  }, [workouts, exerciseType]);

  // -----------------------------------------------------------------------
  // Columns
  // -----------------------------------------------------------------------
  const columns = useMemo<ColumnDef<Workout, unknown>[]>(
    () => [
      /* --- Expander --- */
      {
        id: "expander",
        header: () => null,
        size: 40,
        enableHiding: false,
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={row.getToggleExpandedHandler()}
            aria-expanded={row.getIsExpanded()}
            aria-label={row.getIsExpanded() ? "Collapse workout" : "Expand workout"}
            className="shrink-0"
          >
            {row.getIsExpanded() ? (
              <ChevronDownIcon className="size-4" />
            ) : (
              <ChevronRightIcon className="size-4" />
            )}
          </Button>
        ),
      },
      /* --- Date --- */
      {
        accessorKey: "date",
        id: "date",
        header: ({ column }) => (
          <SortableHeader label={t("columns.date")} column={column as unknown as SortableColumn} />
        ),
        sortingFn: "datetime",
        size: 140,
        cell: ({ getValue }) => (
          <span className="font-semibold">
            {formatDate(getValue<string>() as string, "MMM D, YYYY")}
          </span>
        ),
      },
      /* --- Exercises --- */
      {
        accessorFn: (d) => d.exercises.map((e) => e.name).join(", "),
        id: "exercises",
        header: ({ column }) => (
          <SortableHeader label={t("columns.exercises")} column={column as unknown as SortableColumn} />
        ),
        sortUndefined: "last",
        sortingFn: "basic",
        filterFn: "includesString",
        size: 280,
        cell: ({ row, getValue }) => {
          const names = getValue() as string;
          const count = row.original.exercises.length;
          return (
            <div className="max-w-[320px]">
              <p className="truncate" title={names}>{names}</p>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                {t("exercise_count", { count })}
              </p>
            </div>
          );
        },
      },
      /* --- Sets --- */
      {
        accessorFn: (d) =>
          d.exercises.reduce((sum, ex) => sum + (ex.sets?.length ?? 0), 0),
        id: "sets",
        header: t("columns.sets"),
        cell: ({ getValue }) => (
          <span className="tabular-nums">{getValue<number>()}</span>
        ),
        size: 60,
      },
      /* --- Reps --- */
      {
        accessorFn: (d) =>
          d.exercises.reduce(
            (sum, ex) => sum + (ex.sets ?? []).reduce((s, st) => s + (st.reps || 0), 0),
            0,
          ),
        id: "reps",
        header: t("columns.reps"),
        cell: ({ getValue }) => (
          <span className="tabular-nums">{getValue<number>()}</span>
        ),
        size: 60,
      },
      /* --- Plan --- */
      {
        accessorKey: "planId",
        id: "plan",
        header: t("columns.plan"),
        enableSorting: false,
        size: 100,
        cell: ({ getValue }) => {
          const planId = getValue<number>();
          if (planId) {
            return (
              <Badge variant="outline" className="rounded-none">
                {t("plan_badge", { id: planId })}
              </Badge>
            );
          }
          return <span className="text-muted-foreground">—</span>;
        },
        filterFn: (row, _columnId, filterValue) => {
          if (!filterValue || filterValue === "all") return true;
          const hasPlan = Boolean(row.original.planId);
          return filterValue === "plan" ? hasPlan : !hasPlan;
        },
      },
    ],
    [t],
  );

  // -----------------------------------------------------------------------
  // Table state
  // -----------------------------------------------------------------------
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "date", desc: true },
  ]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [expanded, setExpanded] = React.useState<ExpandedState>({});
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: PAGINATION.CLIENT_TABLE_PAGE_SIZE,
  });

  // Reset on filter change (same pattern used by usePageResetOnChange)
  const [seenResetKey, setSeenResetKey] = React.useState(resetKey);
  if (seenResetKey !== resetKey) {
    setSeenResetKey(resetKey);
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    setExpanded({});
  }

  const table = useReactTable({
    data: filteredWorkouts,
    columns,
    state: { sorting, columnFilters, pagination, expanded },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    onExpandedChange: setExpanded,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowCanExpand: () => true,
    autoResetPageIndex: false,
    defaultColumn: { size: 100 },
  });

  // -----------------------------------------------------------------------
  // Toolbar helpers
  // -----------------------------------------------------------------------
  const exerciseColumn = table.getColumn("exercises")!;
  const planColumn = table.getColumn("plan")!;

  const exerciseSearch = ((exerciseColumn?.getFilterValue() as string) ?? "").trimEnd();
  const planFilter = ((planColumn?.getFilterValue() as string) ?? "all") as string;
  const hasFilters = Boolean(exerciseSearch) || planFilter !== "all";

  const clearFilters = React.useCallback(() => {
    exerciseColumn.setFilterValue(undefined);
    planColumn.setFilterValue(undefined);
  }, [exerciseColumn, planColumn]);

  const LABEL_CLASS = "font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground";

  // Select items for base-ui
  const planFilterItems = useMemo(
    () => [
      { value: "all", label: t("filters.all_plans") },
      { value: "plan", label: t("filters.from_plan") },
      { value: "adhoc", label: t("filters.adhoc") },
    ],
    [t],
  );

  const pageSizeItems = useMemo(
    () => [7, 14, 28].map((s) => ({ value: String(s), label: String(s) })),
    [],
  );

  // -----------------------------------------------------------------------
  return (
    <div className="space-y-3">
      {/* ── Toolbar ──────────────────────────────────────── */}
      <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
        {/* Exercise search */}
        <div className="relative flex-1 min-w-[180px] max-w-sm">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden>
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="search"
            autoComplete="off"
            placeholder={t("filters.search_placeholder")}
            value={exerciseSearch}
            onChange={(e) => {
              exerciseColumn.setFilterValue(e.target.value.trimEnd());
              setPagination((p) => (p.pageIndex === 0 ? p : { ...p, pageIndex: 0 }));
            }}
            aria-label={t("filters.search_placeholder")}
            className="h-8 rounded-none border border-input bg-transparent pl-9 pr-2 text-sm shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        {/* Plan filter */}
        <div className="flex items-center gap-2">
          <span className={LABEL_CLASS}>{t("filters.plan")}</span>
          <SelectWithControl
            value={planFilter}
            items={planFilterItems}
            onChange={(v) => {
              planColumn.setFilterValue(v);
              setPagination((p) => (p.pageIndex === 0 ? p : { ...p, pageIndex: 0 }));
            }}
            triggerSize="sm"
            className={cn("w-[180px] rounded-none shadow-none ring-0", "")}
            contentClassName="rounded-none shadow-none ring-0"
          />
        </div>

        {/* Clear all filters */}
        {hasFilters && (
          <Button variant="outline" size="icon-xs" onClick={clearFilters} aria-label={t("filters.clear")} className="shrink-0 rounded-none">
            <ClearIcon />
          </Button>
        )}
      </div>

      {/* ── Table ────────────────────────────────────────── */}
      <div className="border border-border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    style={{ width: header.getSize() }}
                    aria-sort={
                      header.column.getCanSort()
                        ? header.column.getIsSorted() === "asc"
                          ? ("ascending" as const)
                          : header.column.getIsSorted() === "desc"
                            ? ("descending" as const)
                            : undefined
                        : undefined
                    }
                  >
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={table.getAllColumns().length} className="py-10 text-center text-muted-foreground">
                  {t("empty_filtered")}
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <React.Fragment key={row.id}>
                  <TableRow data-state={row.getIsSelected() ? "selected" : undefined}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                  {row.getIsExpanded() && (
                    <TableRow className="hover:bg-transparent [&>td]:bg-transparent">
                      <TableCell colSpan={row.getVisibleCells().length} className="p-0">
                        <WorkoutRowDetail workout={row.original} />
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))
            )}
          </TableBody>
        </Table>

        {/* ── Footer / Pagination ─────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              {table.getPageCount()}
            </span>
            <span className="text-muted-foreground/50">|</span>
            <span>
              {t("pagination.rows_of", { shown: table.getRowModel().rows.length, total: table.getFilteredRowModel().rows.length })}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Page size */}
            <span className={LABEL_CLASS}>{t("pagination.page_size")}</span>
            <SelectWithControl
              value={String(pagination.pageSize)}
              items={pageSizeItems}
              onChange={(v) => setPagination({ pageIndex: 0, pageSize: Number(v) })}
              triggerSize="sm"
              className="w-[64px] rounded-none shadow-none ring-0"
              contentClassName="rounded-none shadow-none ring-0"
            />

            <Button variant="outline" size="icon-xs" onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()} aria-label={t("pagination.first")}>
              <FirstPageIcon />
            </Button>

            <Button variant="outline" size="icon-xs" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} aria-label={t("pagination.previous")}>
              <PrevPageIcon />
            </Button>

            <span className="font-mono text-[11px] text-foreground">
              {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
            </span>

            <Button variant="outline" size="icon-xs" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} aria-label={t("pagination.next")}>
              <NextPageIcon />
            </Button>

            <Button variant="outline" size="icon-xs" onClick={() => table.setPageIndex(table.getPageCount() - 1)} disabled={!table.getCanNextPage()} aria-label={t("pagination.last")}>
              <LastPageIcon />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Minimal select wrapper around Base UI select
// ---------------------------------------------------------------------------

import { Select as SelectPrimitive } from "@base-ui/react/select";

function SelectWithControl({
  value,
  items,
  onChange,
  triggerSize = "default",
  className,
  contentClassName,
}: {
  value: string;
  items: Array<{ value: string; label: string }>;
  onChange: (value: string | null) => void;
  triggerSize?: "sm" | "default";
  className?: string;
  contentClassName?: string;
}) {
  return (
    <SelectPrimitive.Root value={value} onValueChange={onChange} items={items}>
      <SelectPrimitive.Trigger
        className={cn(
          "flex w-fit items-center justify-between gap-1.5 rounded-md border border-input bg-transparent py-2 pr-2 pl-2.5 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-placeholder:text-muted-foreground data-[size=default]:h-9 data-[size=sm]:h-8 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-1.5 dark:bg-input/30 dark:hover:bg-input/50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-5",
          triggerSize === "sm" && "min-w-8 h-8 p-0 pl-2.5",
          className,
        )}
      >
        <SelectPrimitive.Value />
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Positioner>
          <SelectPrimitive.Popup
            className={cn(
              "relative isolate z-50 min-w-36 overflow-x-hidden overflow-y-auto rounded-md border border-border bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
              contentClassName,
            )}
          >
            <SelectPrimitive.List className="p-1">
              {items.map((item) => (
                <SelectPrimitive.Item
                  key={item.value}
                  value={item.value}
                  className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground data-highlighted:bg-accent data-highlighted:text-accent-foreground data-[active-item]:bg-accent data-[active-item]:text-accent-foreground"
                >
                  <SelectPrimitive.ItemText>{item.label}</SelectPrimitive.ItemText>
                  <SelectPrimitive.ItemIndicator className="absolute right-2">
                    <CheckIcon />
                  </SelectPrimitive.ItemIndicator>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.List>
          </SelectPrimitive.Popup>
        </SelectPrimitive.Positioner>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

// ---------------------------------------------------------------------------
// Icon components
// ---------------------------------------------------------------------------

function CheckIcon(props: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className ?? "size-4"} aria-hidden>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function ClearIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4" aria-hidden>
      <path d="M18 6 6 18" /><path d="m6 6 12 12" />
    </svg>
  );
}

function FirstPageIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-3" aria-hidden>
      <polyline points="11 17 6 12 11 7" /><polyline points="18 17 13 12 18 7" />
    </svg>
  );
}

function PrevPageIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-3" aria-hidden>
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function NextPageIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-3" aria-hidden>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function LastPageIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-3" aria-hidden>
      <polyline points="13 17 18 12 13 7" /><polyline points="6 17 11 12 6 7" />
    </svg>
  );
}
