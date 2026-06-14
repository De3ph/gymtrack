"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";

import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious
} from "@/components/ui/pagination";
import { bodyMeasurementApi } from "@/lib/api";
import { PAGINATION } from "@/lib/constants";
import { useTranslations } from "next-intl";
import { BodyMeasurement } from "@/types";
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
}

const EMPTY_FILTER: BodyMeasurementFilter = {};

export function BodyMeasurementList({
  measurements: propMeasurements,
  readOnly = false,
  onEdit: onEditProp,
  filter: filterProp,
  onFilterChange,
  page: pageProp,
  onPageChange
}: BodyMeasurementListProps) {
  const t = useTranslations("body_measurement.list");
  const tPagination = useTranslations("body_measurement.pagination");

  const [internalFilter, setInternalFilter] = React.useState<BodyMeasurementFilter>(EMPTY_FILTER);
  const [internalPage, setInternalPage] = React.useState(1);

  const filter = filterProp ?? internalFilter;
  const page = pageProp ?? internalPage;

  const handleFilterChange = (next: BodyMeasurementFilter) => {
    if (onFilterChange) {
      onFilterChange(next);
    } else {
      setInternalFilter(next);
      setInternalPage(1);
    }
  };

  const handlePageChange = (next: number) => {
    if (onPageChange) onPageChange(next);
    else setInternalPage(next);
  };

  const [editing, setEditing] = React.useState<BodyMeasurement | null>(null);
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState<BodyMeasurement | null>(null);
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  const pageSize = PAGINATION.BODY_MEASUREMENT_PAGE_SIZE;
  const isSelfFetching = !propMeasurements;

  const { data, isLoading } = useQuery({
    queryKey: [
      "body-measurements",
      {
        page,
        pageSize,
        startDate: filter.startDate,
        endDate: filter.endDate
      }
    ],
    queryFn: () =>
      bodyMeasurementApi.getAll({
        limit: pageSize,
        offset: (page - 1) * pageSize,
        startDate: filter.startDate,
        endDate: filter.endDate
      }),
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

  if (isLoading && isSelfFetching) {
    return <div>{t("loading")}</div>;
  }

  const measurements = propMeasurements || data?.measurements || [];
  const totalCount = propMeasurements ? propMeasurements.length : data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const showPagination = isSelfFetching && totalPages > 1;

  const filterBar = isSelfFetching ? (
    <BodyMeasurementFilterBar
      filter={filter}
      onChange={handleFilterChange}
    />
  ) : null;

  if (measurements.length === 0) {
    return (
      <div className="space-y-4">
        {filterBar}
        <div className="text-center p-8 text-muted-foreground">
          {t("no_measurements")}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {filterBar}

      {isSelfFetching && totalCount > 0 && (
        <div className="text-xs text-muted-foreground">
          {tPagination("count", { count: totalCount })}
        </div>
      )}

      {measurements.map((m, idx) => (
        <BodyMeasurementListItem
          key={m.measurementId}
          measurement={m}
          previous={measurements[idx + 1]}
          readOnly={readOnly}
          onEdit={handleEdit}
          onDelete={handleDelete}
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
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
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
            ))}
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
