"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useQueryClient } from "@tanstack/react-query";
import { useSearchParams, usePathname } from "next/navigation";
import { qk } from "@/lib/query-keys";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsPanel, TabsList, TabsTab } from "@/components/animate-ui/components/base/tabs";
import { BodyMeasurementForm } from "@/components/features/body-measurement/BodyMeasurementForm";
import {
  BodyMeasurementFilter,
  BodyMeasurementList
} from "@/components/features/body-measurement/BodyMeasurementList";
import { useMeasurementListStore } from "@/stores/measurement-list-store";

const BodyMeasurementCharts = dynamic(
  () => import("@/components/features/body-measurement/BodyMeasurementCharts").then(m => m.BodyMeasurementCharts),
  { ssr: false, loading: () => <Skeleton className="h-[240px]" /> }
);
import { BodyMeasurement } from "@/types";
import { useTranslations } from "next-intl";

interface MeasurementsClientProps {
  latest: BodyMeasurement | null;
}

export function MeasurementsClient({ latest }: MeasurementsClientProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<"log" | "list" | "charts">(() => {
    const tabParam = searchParams.get("tab");
    return tabParam === "list" || tabParam === "charts" ? tabParam : "log";
  });
  const t = useTranslations("athlete.measurements");
  const queryClient = useQueryClient();
  const justSubmittedRef = useRef(false);
  // Back filter/page with the shared store so they survive route/tab switches.
  const measurementListStore = useMeasurementListStore();
  const filter = measurementListStore.filter;
  const page = measurementListStore.page;

  const handleFilterChange = useCallback((next: BodyMeasurementFilter) => {
    // setFilter resets page to 1 inside the store.
    measurementListStore.setFilter(next);
  }, [measurementListStore]);

  const handleTabChange = useCallback(
    (value: string) => {
      const next = value === "list" || value === "charts" ? value : "log";
      setActiveTab(next);
      // Update the URL without triggering a Next.js navigation/re-render,
      // which was causing the tab animation to lag.
      const params = new URLSearchParams(window.location.search);
      if (next === "log") {
        params.delete("tab");
      } else {
        params.set("tab", next);
      }
      const qs = params.toString();
      window.history.replaceState(null, "", qs ? `${pathname}?${qs}` : pathname);
    },
    [pathname]
  );

  useEffect(() => {
    if (!justSubmittedRef.current) return;
    if (activeTab === "list") {
      // Covers list, charts and latest through the shared `body-measurements` prefix.
      queryClient.invalidateQueries({ queryKey: qk.measurements.all });
    } else if (activeTab === "charts") {
      // Prefix key: must still match chart queries built with a date filter.
      queryClient.invalidateQueries({ queryKey: qk.measurements.chartsAll });
    }
    justSubmittedRef.current = false;
  }, [activeTab, queryClient]);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="font-mono text-3xl font-semibold leading-none tracking-[-0.04em] text-foreground">
          {t("title")}
        </h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>

      {latest && (
        <Card className="rounded-none border border-border shadow-none ring-0">
          <CardHeader className="rounded-none border-b border-border pb-3">
            <CardTitle className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              {t("latest.title")}
            </CardTitle>
            <CardDescription className="font-mono text-xs">
              {new Date(latest.date).toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
                day: "numeric"
              })}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4">
            {typeof latest.weight === "number" && (
              <div>
                <div className="font-mono text-2xl font-semibold tracking-tight text-foreground">
                  {latest.weight.toFixed(1)} {latest.weightUnit}
                </div>
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{t("latest.weight")}</div>
              </div>
            )}
            {typeof latest.bodyFatPct === "number" && latest.bodyFatPct > 0 && (
              <div>
                <div className="font-mono text-2xl font-semibold tracking-tight text-foreground">
                  {latest.bodyFatPct.toFixed(1)}%
                </div>
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{t("latest.body_fat")}</div>
              </div>
            )}

          </CardContent>
        </Card>
      )}

      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-3 mb-2">
          <TabsTab value="log">{t("log_tab")}</TabsTab>
          <TabsTab value="list">{t("list_tab")}</TabsTab>
          <TabsTab value="charts">{t("charts_tab")}</TabsTab>
        </TabsList>

        <TabsPanel transition={{ duration: 0.15, ease: "easeInOut" }} value="log">
          <div className="max-w-3xl">
            <Card className="rounded-none border border-border shadow-none ring-0">
              <CardHeader className="rounded-none border-b border-border">
                <CardTitle className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  {t("log_card_title")}
                </CardTitle>
                <CardDescription>{t("log_card_description")}</CardDescription>
              </CardHeader>
              <CardContent>
                <BodyMeasurementForm
                  onSuccess={() => {
                    justSubmittedRef.current = true;
                    handleTabChange("list");
                  }}
                />
              </CardContent>
            </Card>
          </div>
        </TabsPanel>

        <TabsPanel transition={{ duration: 0.15, ease: "easeInOut" }} value="list">
          <BodyMeasurementList
            filter={filter}
            onFilterChange={handleFilterChange}
            page={page}
            onPageChange={measurementListStore.setPage}
          />
        </TabsPanel>

        <TabsPanel transition={{ duration: 0.15, ease: "easeInOut" }} value="charts">
          <BodyMeasurementCharts
            filter={filter}
            onFilterChange={handleFilterChange}
          />
        </TabsPanel>
      </Tabs>
    </div>
  );
}
