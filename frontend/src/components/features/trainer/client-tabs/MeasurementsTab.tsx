"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BodyMeasurementList } from "@/components/features/body-measurement/BodyMeasurementList";
import { BodyMeasurementCharts } from "@/components/features/body-measurement/BodyMeasurementCharts";
import { useTranslations } from "next-intl";
import { BodyMeasurement } from "@/types";

interface MeasurementsTabProps {
  measurements: BodyMeasurement[];
}

export function MeasurementsTab({ measurements }: MeasurementsTabProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const subtabParam = searchParams.get("subtab");
  const activeSubtab = subtabParam === "charts" ? "charts" : "list";
  const t = useTranslations("trainer.client_detail.tabs");

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

  return (
    <div className="rounded-none border border-border">
      <div className="px-6 py-4 border-b border-border">
        <h3 className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{t("measurements_title")}</h3>
        <p className="text-sm text-muted-foreground mt-1">{t("measurements_description")}</p>
      </div>
      <div className="p-6">
        <Tabs value={activeSubtab} onValueChange={handleSubtabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4 rounded-none border border-border">
            <TabsTrigger value="list">
              {t("measurements_list")} ({measurements.length})
            </TabsTrigger>
            <TabsTrigger value="charts">{t("measurements_charts")}</TabsTrigger>
          </TabsList>
          <TabsContent value="list">
            {measurements.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                {t("no_measurements")}
              </p>
            ) : (
              <BodyMeasurementList measurements={measurements} readOnly={true} />
            )}
          </TabsContent>
          <TabsContent value="charts">
            <BodyMeasurementCharts measurements={measurements} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
