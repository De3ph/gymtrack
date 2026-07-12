"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useQueryClient } from "@tanstack/react-query";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BodyMeasurementForm } from "@/components/features/body-measurement/BodyMeasurementForm";
import {
  BodyMeasurementFilter,
  BodyMeasurementList
} from "@/components/features/body-measurement/BodyMeasurementList";

const BodyMeasurementCharts = dynamic(
  () => import("@/components/features/body-measurement/BodyMeasurementCharts").then(m => m.BodyMeasurementCharts),
  { ssr: false, loading: () => <Skeleton className="h-[240px]" /> }
);
import { BodyMeasurement } from "@/types";
import { useTranslations } from "next-intl";

const EMPTY_FILTER: BodyMeasurementFilter = {};

interface MeasurementsClientProps {
  latest: BodyMeasurement | null;
}

export function MeasurementsClient({ latest }: MeasurementsClientProps) {
  const [activeTab, setActiveTab] = useState("log");
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<BodyMeasurementFilter>(EMPTY_FILTER);
  const t = useTranslations("athlete.measurements");
  const queryClient = useQueryClient();
  const justSubmittedRef = useRef(false);


  const handleFilterChange = useCallback((next: BodyMeasurementFilter) => {
    setFilter(next);
    setPage(1);
  }, []);

  useEffect(() => {
    if (!justSubmittedRef.current) return;
    if (activeTab === "list") {
      queryClient.invalidateQueries({ queryKey: ["body-measurements"] });
      queryClient.invalidateQueries({ queryKey: ["latest-body-measurement"] });
    } else if (activeTab === "charts") {
      queryClient.invalidateQueries({ queryKey: ["body-measurements"] });
    }
    justSubmittedRef.current = false;
  }, [activeTab, queryClient]);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>

      {latest && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t("latest.title")}</CardTitle>
            <CardDescription>
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
                <div className="text-2xl font-bold">
                  {latest.weight.toFixed(1)} {latest.weightUnit}
                </div>
                <div className="text-xs text-muted-foreground">{t("latest.weight")}</div>
              </div>
            )}
            {typeof latest.bodyFatPct === "number" && latest.bodyFatPct > 0 && (
              <div>
                <div className="text-2xl font-bold">
                  {latest.bodyFatPct.toFixed(1)}%
                </div>
                <div className="text-xs text-muted-foreground">{t("latest.body_fat")}</div>
              </div>
            )}

          </CardContent>
        </Card>
      )}

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="log">{t("log_tab")}</TabsTrigger>
          <TabsTrigger value="list">{t("list_tab")}</TabsTrigger>
          <TabsTrigger value="charts">{t("charts_tab")}</TabsTrigger>
        </TabsList>

        <TabsContent value="log">
          <div className="max-w-3xl">
            <Card>
              <CardHeader>
                <CardTitle>{t("log_card_title")}</CardTitle>
                <CardDescription>{t("log_card_description")}</CardDescription>
              </CardHeader>
              <CardContent>
                <BodyMeasurementForm
                  onSuccess={() => {
                    justSubmittedRef.current = true;
                    setActiveTab("list");
                  }}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="list">
          <BodyMeasurementList
            filter={filter}
            onFilterChange={handleFilterChange}
            page={page}
            onPageChange={setPage}
          />
        </TabsContent>

        <TabsContent value="charts">
          <BodyMeasurementCharts
            filter={filter}
            onFilterChange={handleFilterChange}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
