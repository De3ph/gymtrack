"use client";

import * as React from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious
} from "@/components/ui/pagination";
import { bodyMeasurementApi } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import { ApiErrorHandler } from "@/lib/error-handler";
import { DataError } from "@/components/features/DataError";
import { PAGINATION } from "@/lib/constants";
import { getPaginationRange } from "@/lib/pagination";
import { Spinner } from "@/components/ui/spinner";
import {
  Empty,
  EmptyHeader,
  EmptyTitle
} from "@/components/ui/empty";
import { useTranslations } from "next-intl";
import { BodyMeasurement } from "@/types";
import { useMeasurementListStore } from "@/stores/measurement-list-store";
import { useCollapseSeed } from "@/hooks/use-collapse-seed";
import { BodyMeasurementFilterBar } from "./BodyMeasurementFilterBar";
import { BodyMeasurementListItem } from "./BodyMeasurementListItem";
import { EditBodyMeasurementDialog } from "./EditBodyMeasurementDialog";
import { DeleteBodyMeasurementDialog } from "./DeleteBodyMeasurementDialog";

export interface BodyMeasurementFilter {
  startDate?: string;
  endDate?: string;
}

interface BodyMeasurementListProps {
  measurements?: BodyMeasurement[];
  readOnly?: boolean;
  onEdit?: (m: BodyMeasurement) => void;
  filter?: BodyMeasurementFilter;
  onFilterChange?: (filter: BodyMeasurementFilter) => void;
  page?: number;
  onPageChange?: (page: number) => void;
  /**
   * Server-side total for the current filter. Pass it when the caller owns
   * the query (trainer client tabs); without it the list only paginates when
   * it fetches by itself.
   */
  totalCount?: number;
  /**
   * The row that follows the last item on this page, used for its delta.
   * Paging slices break the "previous row" chain, so the caller fetches the
   * next page's newest row and hands it over.
   */
  previousOfLast?: BodyMeasurement;
  /**
   * Start every row collapsed except the most recent one. On by default —
   * pass `false` to show every row expanded.
   */
  collapseAllExceptNewest?: boolean;
}

export function BodyMeasurementList({
  measurements: propMeasurements,
  readOnly = false,
  onEdit: onEditProp,
  filter: filterProp,
  onFilterChange,
  page: pageProp,
  onPageChange,
  totalCount: totalCountProp,
  previousOfLast,
  collapseAllExceptNewest = true
}: BodyMeasurementListProps) {
  const t = useTranslations("body_measurement.list");
  const tPagination = useTranslations("body_measurement.pagination");
  const measurementListStore = useMeasurementListStore();

  const filter = filterProp ?? measurementListStore.filter;
  const page = pageProp ?? measurementListStore.page;

  const handleFilterChange = (next: BodyMeasurementFilter) => {
    if (onFilterChange) {
      onFilterChange(next);
    } else {
      // setFilter resets page to 1 inside the store.
      measurementListStore.setFilter(next);
    }
  };

  const handlePageChange = (next: number) => {
    if (onPageChange) onPageChange(next);
    else measurementListStore.setPage(next);
  };

  const [editing, setEditing] = React.useState<BodyMeasurement | null>(null);
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState<BodyMeasurement | null>(null);
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  const pageSize = PAGINATION.BODY_MEASUREMENT_PAGE_SIZE;
  const isSelfFetching = !propMeasurements;

  const filterBar = isSelfFetching ? (
    <BodyMeasurementFilterBar
      filter={filter}
      onChange={handleFilterChange}
    />
  ) : null;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: qk.measurements.list({
      page,
      pageSize,
      startDate: filter.startDate,
      endDate: filter.endDate
    }),
    queryFn: () =>
      bodyMeasurementApi.getAll({
        limit: pageSize,
        offset: (page - 1) * pageSize,
        startDate: filter.startDate,
        endDate: filter.endDate
      }),
    // Keep the previous page visible while the next one loads.
    placeholderData: keepPreviousData,
    enabled: isSelfFetching
  });

  const handleEdit = (m: BodyMeasurement) => {
    if (onEditProp) {
      onEditProp(m);
    } else {
      setEditing(m);
      setEditOpen(true);
    }
  };

  const handleDelete = (m: BodyMeasurement) => {
    setDeleting(m);
    setDeleteOpen(true);
  };

  const measurements = propMeasurements || data?.measurements || [];

  // Every row starts collapsed except the most recent one.
  const { collapsedIds, toggleCollapsed } = useCollapseSeed(
    measurements.map((m) => ({ id: m.measurementId, date: m.date })),
    collapseAllExceptNewest,
  );

  if (isLoading && isSelfFetching) {
    return (
      <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
        <Spinner />
        {t("loading")}
      </div>
    );
  }

  if (isSelfFetching && error) {
    return (
      <div className="space-y-4">
        {filterBar}
        <DataError
          message={ApiErrorHandler.handle(error)}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  const propTotal = propMeasurements ? propMeasurements.length : undefined;
  const totalCount = totalCountProp ?? propTotal ?? data?.count ?? 0;

  // A caller that supplies its own total owns the paging UI; otherwise only
  // the self-fetching list can paginate.
  const canPaginate = isSelfFetching || totalCountProp !== undefined;

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const showPagination = totalPages > 1 && canPaginate;

  if (measurements.length === 0) {
    return (
      <div className="space-y-4">
        {filterBar}
        <Empty className="rounded-none border border-border">
          <EmptyHeader>
            <EmptyTitle className="font-mono text-xs uppercase tracking-[0.18em]">
              {t("no_measurements")}
            </EmptyTitle>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {filterBar}

      {(canPaginate) && totalCount > 0 && (
        <div className="text-xs text-muted-foreground">
          {tPagination("count", { count: totalCount })}
        </div>
      )}

      {measurements.map((m, idx) => (
        <BodyMeasurementListItem
          key={m.measurementId}
          measurement={m}
          previous={
            measurements[idx + 1] ??
            (idx === measurements.length - 1 ? previousOfLast : undefined)
          }
          readOnly={readOnly}
          onEdit={handleEdit}
          onDelete={handleDelete}
          isCollapsed={Boolean(collapsedIds[String(m.measurementId)])}
          onToggle={() => {
            if (m.measurementId != null) toggleCollapsed(m.measurementId);
          }}
        />
      ))}

      {showPagination && (
        <Pagination className="mt-6">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={(e) => {
                  e.preventDefault();
                  if (page > 1) handlePageChange(page - 1);
                }}
                aria-disabled={page <= 1}
                className={page <= 1 ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
            {getPaginationRange(page, totalPages).map((p, index) =>
              p === "ellipsis" ? (
                <PaginationItem key={`ellipsis-${index}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              ) : (
                <PaginationItem key={p}>
                  <PaginationLink
                    isActive={p === page}
                    onClick={(e) => {
                      e.preventDefault();
                      handlePageChange(p);
                    }}
                  >
                    {p}
                  </PaginationLink>
                </PaginationItem>
              ),
            )}
            <PaginationItem>
              <PaginationNext
                onClick={(e) => {
                  e.preventDefault();
                  if (page < totalPages) handlePageChange(page + 1);
                }}
                aria-disabled={page >= totalPages}
                className={page >= totalPages ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      {!readOnly && !onEditProp && (
        <>
          <EditBodyMeasurementDialog
            measurement={editing}
            open={editOpen}
            onOpenChange={setEditOpen}
          />
          <DeleteBodyMeasurementDialog
            measurement={deleting}
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
          />
        </>
      )}
    </div>
  );
}
