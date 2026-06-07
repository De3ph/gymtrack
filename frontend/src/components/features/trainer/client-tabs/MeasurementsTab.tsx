"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { BodyMeasurementList } from "@/components/features/body-measurement/BodyMeasurementList";
import { BodyMeasurementCharts } from "@/components/features/body-measurement/BodyMeasurementCharts";
import { useTranslations } from "next-intl";
import { BodyMeasurement } from "@/types";

interface MeasurementsTabProps {
  measurements: BodyMeasurement[];
}

export function MeasurementsTab({ measurements }: MeasurementsTabProps) {
  const t = useTranslations("trainer.client_detail.tabs");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("measurements_title")}</CardTitle>
        <CardDescription>{t("measurements_description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="list" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
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
      </CardContent>
    </Card>
  );
}
