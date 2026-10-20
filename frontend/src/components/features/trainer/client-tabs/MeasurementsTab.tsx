"use client";

import * as React from "react";
import { useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { Tabs, TabsPanel, TabsList, TabsTab } from "@/components/animate-ui/components/base/tabs";
import { BodyMeasurementList } from "@/components/features/body-measurement/BodyMeasurementList";
import { BodyMeasurementCharts } from "@/components/features/body-measurement/BodyMeasurementCharts";
import { DataError } from "@/components/features/DataError";
import { Spinner } from "@/components/ui/spinner";
import { trainerClientApi } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import { ApiErrorHandler } from "@/lib/error-handler";
import { STALE_TIMES } from "@/lib/api/api-constants";
import { PAGINATION } from "@/lib/constants";
import { useTranslations } from "next-intl";
import type { BodyMeasurement } from "@/types";
import { toClientDateRange } from "./client-date-range";
import { clientHistoryKey, usePageResetOnChange } from "./client-list-state";

interface MeasurementsTabProps {
  username: string;
  dateRange: { start: string; end: string };
  /** Distinguishes "nothing logged" from "nothing matches the filters". */
  isFiltered: boolean;
  onCountChange: (count: number | null) => void;
}

export function MeasurementsTab({
  username,
  dateRange,
  isFiltered,
  onCountChange,
}: MeasurementsTabProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const subtabParam = searchParams.get("subtab");
  const activeSubtab = subtabParam === "charts" ? "charts" : "list";
  const t = useTranslations("trainer.client_detail.tabs");

  const [page, setPage] = usePageResetOnChange(
    clientHistoryKey(username, dateRange),
  );

  const pageSize = PAGINATION.BODY_MEASUREMENT_PAGE_SIZE;
  const range = toClientDateRange(dateRange);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: qk.measurements.clientList(username, {
      page,
      pageSize,
      startDate: range.startDate,
      endDate: range.endDate,
    }),
    queryFn: () =>
      trainerClientApi.getClientMeasurements(username, {
        limit: pageSize,
        offset: (page - 1) * pageSize,
        startDate: range.startDate,
        endDate: range.endDate,
      }),
    // Keep the current page on screen while the next one loads.
    placeholderData: keepPreviousData,
  });

  const total = data?.count ?? null;
  const pageCount = data?.measurements.length ?? 0;

  React.useEffect(() => {
    onCountChange(total);
  }, [total, onCountChange]);

  // Each item shows a delta against the row before it. A page slice breaks
  // that chain at the last row, so fetch the next page's newest row and hand
  // it over as its comparison point.
  const needsBoundary = pageCount === pageSize;
  const { data: nextPage } = useQuery({
    queryKey: qk.measurements.clientList(username, {
      page: page + 1,
      pageSize: 1,
      startDate: range.startDate,
      endDate: range.endDate,
    }),
    queryFn: () =>
      trainerClientApi.getClientMeasurements(username, {
        limit: 1,
        offset: page * pageSize,
        startDate: range.startDate,
        endDate: range.endDate,
      }),
    enabled: needsBoundary,
    staleTime: STALE_TIMES.FIVE_MINUTES,
  });

  const previousOfLast: BodyMeasurement | undefined =
    needsBoundary && nextPage?.measurements[0] ? nextPage.measurements[0] : undefined;

  const handleSubtabChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === "list") {
        params.delete("subtab");
      } else {
        params.set("subtab", value);
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  let listBody: React.ReactNode;

  if (isLoading) {
    listBody = (
      <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
        <Spinner aria-hidden="true" />
        {t("loading")}
      </div>
    );
  } else if (error) {
    listBody = (
      <DataError
        message={ApiErrorHandler.handle(error)}
        onRetry={() => refetch()}
      />
    );
  } else if (!data || data.measurements.length === 0) {
    listBody = (
      <p className="py-8 text-center text-muted-foreground">
        {isFiltered ? t("no_measurements_filtered") : t("no_measurements")}
      </p>
    );
  } else {
    listBody = (
      <BodyMeasurementList
        measurements={data.measurements}
        readOnly={true}
        totalCount={data.count}
        page={page}
        onPageChange={setPage}
        previousOfLast={previousOfLast}
      />
    );
  }

  return (
    <div className="rounded-none border border-border">
      <div className="px-6 py-4 border-b border-border">
        <h3 className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{t("measurements_title")}</h3>
        <p className="text-sm text-muted-foreground mt-1">{t("measurements_description")}</p>
      </div>
      <div className="p-6">
        <Tabs value={activeSubtab} onValueChange={handleSubtabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4 rounded-none border border-border">
            <TabsTab value="list">
              {t("measurements_list")}
              {total === null ? "" : ` (${total})`}
            </TabsTab>
            <TabsTab value="charts">{t("measurements_charts")}</TabsTab>
          </TabsList>
          <TabsPanel
            transition={{ duration: 0.15, ease: "easeInOut" }}
            value="list"
            keepMounted
          >
            {listBody}
          </TabsPanel>
          <TabsPanel
            transition={{ duration: 0.15, ease: "easeInOut" }}
            value="charts"
            keepMounted
          >
            <BodyMeasurementCharts
              clientUsername={username}
              clientDateRange={dateRange}
              enabled={activeSubtab === "charts"}
            />
          </TabsPanel>
        </Tabs>
      </div>
    </div>
  );
}
