"use client";

import * as React from "react";
import { useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { Tabs, TabsPanel, TabsList, TabsTab } from "@/components/animate-ui/components/base/tabs";
import { MeasurementsDataTable } from "./MeasurementsDataTable";
import { BodyMeasurementCharts } from "@/components/features/body-measurement/BodyMeasurementCharts";
import { DataError } from "@/components/features/DataError";
import { Spinner } from "@/components/ui/spinner";
import { trainerClientApi } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import { ApiErrorHandler } from "@/lib/error-handler";
import { PAGINATION } from "@/lib/constants";
import { useTranslations } from "next-intl";
import { toClientDateRange } from "./client-date-range";
import { clientHistoryKey } from "./client-list-state";

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

  const range = toClientDateRange(dateRange);

  // Fetch all matching measurements at once so the table can paginate/sort
  // client-side, matching the pattern used by the workouts table.
  const rowBudget = PAGINATION.CLIENT_MEASUREMENTS_ROW_BUDGET;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: qk.measurements.clientList(username, {
      page: 1,
      pageSize: rowBudget,
      startDate: range.startDate,
      endDate: range.endDate,
    }),
    queryFn: () =>
      trainerClientApi.getClientMeasurements(username, {
        limit: rowBudget,
        offset: 0,
        startDate: range.startDate,
        endDate: range.endDate,
      }),
    placeholderData: keepPreviousData,
  });

  const total = data?.count ?? null;

  React.useEffect(() => {
    onCountChange(total);
  }, [total, onCountChange]);

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
      <p className="enter-rise py-8 text-center text-muted-foreground">
        {isFiltered ? t("no_measurements_filtered") : t("no_measurements")}
      </p>
    );
  } else {
    listBody = (
      <MeasurementsDataTable
        measurements={data.measurements}
        resetKey={clientHistoryKey(username, dateRange)}
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
