"use client";

import * as React from "react";
import { useMemo } from "react";
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
import type { BodyMeasurement } from "@/types";

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
// Expanded row detail: body parts + notes
// ---------------------------------------------------------------------------

function MeasurementRowDetail({ measurement }: { measurement: BodyMeasurement }) {
  const t = useTranslations("body_measurement.list");

  const parts = measurement.parts ? Object.entries(measurement.parts) : [];

  if (parts.length === 0 && !measurement.notes) {
    return (
      <div className="space-y-4 border-t border-border bg-muted/30 px-4 py-4 sm:px-6">
        <p className="text-xs text-muted-foreground">{t("no_details")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 border-t border-border bg-muted/30 px-4 py-4 sm:px-6">
      {parts.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {parts.map(([key, part]) => (
            <div
              key={key}
              className="flex items-center justify-between text-sm"
            >
              <span className="text-muted-foreground">
                {t(`part_labels.${key}`, { defaultValue: key })}
              </span>
              <span className="font-mono">{part.value} cm</span>
            </div>
          ))}
        </div>
      )}
      {measurement.notes && (
        <div className="text-sm text-muted-foreground">
          &ldquo;{measurement.notes}&rdquo;
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main data table
// ---------------------------------------------------------------------------

interface MeasurementsDataTableProps {
  measurements: BodyMeasurement[];
  /** When this changes the table resets page, filters and expansion */
  resetKey: string;
}

export function MeasurementsDataTable({
  measurements,
  resetKey,
}: MeasurementsDataTableProps) {
  const t = useTranslations("trainer.client_detail.tabs.measurements_table");

  // -----------------------------------------------------------------------
  // Columns
  // -----------------------------------------------------------------------
  const columns = useMemo<ColumnDef<BodyMeasurement, unknown>[]>(
    () => [
      /* --- Expander --- */
      {
        id: "expander",
        header: () => null,
        size: 40,
        enableHiding: false,
        cell: ({ row }) => {
          const m = row.original;
          const hasDetails =
            (m.parts && Object.keys(m.parts).length > 0) || Boolean(m.notes);
          if (!hasDetails) {
            return <span className="block w-10" aria-hidden="true" />;
          }
          return (
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={row.getToggleExpandedHandler()}
              aria-expanded={row.getIsExpanded()}
              aria-label={row.getIsExpanded() ? "Collapse measurement" : "Expand measurement"}
              className="shrink-0"
            >
              {row.getIsExpanded() ? (
                <ChevronDownIcon className="size-4" />
              ) : (
                <ChevronRightIcon className="size-4" />
              )}
            </Button>
          );
        },
      },
      /* --- Date --- */
      {
        accessorKey: "date",
        id: "date",
        header: ({ column }) => (
          <SortableHeader label={t("columns.date")} column={column as unknown as SortableColumn} />
        ),
        sortingFn: "datetime",
        size: 170,
        cell: ({ getValue }) => {
          const date = getValue<string>() as string;
          return (
            <span className="font-semibold">
              {formatDate(date, "MMM D, YYYY")}
              <span className="block font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                {formatDate(date, "HH:mm")}
              </span>
            </span>
          );
        },
      },
      /* --- Weight --- */
      {
        accessorFn: (d) => d.weight ?? 0,
        id: "weight",
        header: ({ column }) => (
          <SortableHeader label={t("columns.weight")} column={column as unknown as SortableColumn} />
        ),
        sortingFn: "basic",
        size: 110,
        cell: ({ row }) => (
          <Badge variant="secondary" className="rounded-none">
            <span className="font-mono">
              {(row.original.weight ?? 0).toFixed(1)} {row.original.weightUnit}
            </span>
          </Badge>
        ),
      },
      /* --- Body fat --- */
      {
        accessorFn: (d) => d.bodyFatPct ?? -1,
        id: "bodyFat",
        header: ({ column }) => (
          <SortableHeader label={t("columns.body_fat")} column={column as unknown as SortableColumn} />
        ),
        sortingFn: "basic",
        sortUndefined: "last",
        size: 110,
        cell: ({ getValue }) => {
          const value = getValue<number>();
          if (value <= 0) {
            return <span className="text-muted-foreground">—</span>;
          }
          return <span className="font-mono tabular-nums">{value.toFixed(1)}%</span>;
        },
      },
      /* --- Parts --- */
      {
        accessorFn: (d) =>
          d.parts ? Object.keys(d.parts).length : 0,
        id: "parts",
        header: t("columns.parts"),
        enableSorting: false,
        size: 100,
        cell: ({ getValue }) => {
          const count = getValue<number>();
          if (count === 0) {
            return <span className="text-muted-foreground">—</span>;
          }
          return <span className="tabular-nums">{t("parts_count", { count })}</span>;
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
    data: measurements,
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
    getRowCanExpand: (row) =>
      Boolean(
        (row.original.parts && Object.keys(row.original.parts).length > 0) ||
          row.original.notes,
      ),
    autoResetPageIndex: false,
    defaultColumn: { size: 100 },
  });

  const LABEL_CLASS = "font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground";

  const pageSizeItems = useMemo(
    () => [7, 14, 28].map((s) => ({ value: String(s), label: String(s) })),
    [],
  );

  // -----------------------------------------------------------------------
  return (
    <div className="space-y-3">
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
                  {t("empty")}
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
                        <MeasurementRowDetail measurement={row.original} />
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
