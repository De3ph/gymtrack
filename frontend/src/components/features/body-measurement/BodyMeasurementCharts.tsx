"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { bodyMeasurementApi } from "@/lib/api";
import { BODY_PARTS, PAGINATION } from "@/lib/constants";
import { useTranslations } from "next-intl";
import { BodyMeasurement } from "@/types";
import { BodyMeasurementFilterBar } from "./BodyMeasurementFilterBar";
import type { BodyMeasurementFilter } from "./BodyMeasurementList";

interface BodyMeasurementChartsProps {
  measurements?: BodyMeasurement[];
  filter?: BodyMeasurementFilter;
  onFilterChange?: (filter: BodyMeasurementFilter) => void;
}

const COLORS = [
  "#2563eb",
  "#dc2626",
  "#16a34a",
  "#9333ea",
  "#ea580c",
  "#0891b2",
  "#db2777",
  "#65a30d",
  "#7c3aed",
  "#0d9488",
  "#facc15",
  "#f43f5e",
  "#1d4ed8"
];

interface ChartDataPoint {
  date: string;
  weight?: number;
  bodyFatPct?: number;
  [part: string]: number | string | undefined;
}

const EMPTY_FILTER: BodyMeasurementFilter = {};

export function BodyMeasurementCharts({
  measurements: propMeasurements,
  filter: filterProp,
  onFilterChange
}: BodyMeasurementChartsProps) {
  const t = useTranslations("body_measurement.charts");
  const tParts = useTranslations("athlete.measurements.parts");

  const [internalFilter, setInternalFilter] = React.useState<BodyMeasurementFilter>(EMPTY_FILTER);
  const filter = filterProp ?? internalFilter;

  const handleFilterChange = (next: BodyMeasurementFilter) => {
    if (onFilterChange) onFilterChange(next);
    else setInternalFilter(next);
  };

  const isSelfFetching = !propMeasurements;

  const { data, isLoading } = useQuery({
    queryKey: [
      "body-measurements",
      "all-for-charts",
      {
        startDate: filter.startDate,
        endDate: filter.endDate
      }
    ],
    queryFn: () =>
      bodyMeasurementApi.getAll({
        limit: PAGINATION.BODY_MEASUREMENT_CHART_LIMIT,
        startDate: filter.startDate,
        endDate: filter.endDate
      }),
    enabled: isSelfFetching
  });

  if (isLoading && isSelfFetching) {
    return <div>{t("loading")}</div>;
  }

  const raw = propMeasurements || data?.measurements || [];

  const filterBar = isSelfFetching ? (
    <BodyMeasurementFilterBar
      filter={filter}
      onChange={handleFilterChange}
    />
  ) : null;

  if (raw.length === 0) {
    return (
      <div className="space-y-4">
        {filterBar}
        <div className="text-center p-8 text-muted-foreground">{t("no_data")}</div>
      </div>
    );
  }

  // Sort ascending by date for charts
  const sorted = [...raw].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const chartData: ChartDataPoint[] = sorted.map((m) => {
    const point: ChartDataPoint = {
      date: dayjs(m.date).format("MMM D")
    };
    // Convert to kg for chart consistency
    point.weight =
      m.weightUnit === "lbs" ? m.weight * 0.453592 : m.weight;
    if (typeof m.bodyFatPct === "number" && m.bodyFatPct > 0) {
      point.bodyFatPct = m.bodyFatPct;
    }
    if (m.parts) {
      for (const [k, v] of Object.entries(m.parts)) {
        point[k] = v.value;
      }
    }
    return point;
  });

  const availableParts = BODY_PARTS.filter((p) =>
    chartData.some((d) => typeof d[p.key] === "number")
  );

  return (
    <div className="space-y-6">
      {filterBar}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("weight_title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis
                tick={{ fontSize: 12 }}
                domain={["auto", "auto"]}
                label={{
                  value: t("weight_unit_kg"),
                  angle: -90,
                  position: "insideLeft",
                  style: { fontSize: 12 }
                }}
              />
              <Tooltip
                formatter={(value) =>
                  typeof value === "number" ? `${value.toFixed(1)} kg` : value
                }
              />
              <Line
                type="monotone"
                dataKey="weight"
                stroke="#2563eb"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
                name={t("weight_label")}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {chartData.some((d) => typeof d.bodyFatPct === "number") && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("body_fat_title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis
                  tick={{ fontSize: 12 }}
                  domain={[0, 50]}
                  label={{
                    value: "%",
                    angle: -90,
                    position: "insideLeft",
                    style: { fontSize: 12 }
                  }}
                />
                <Tooltip
                  formatter={(value) =>
                    typeof value === "number" ? `${value.toFixed(1)}%` : value
                  }
                />
                <Line
                  type="monotone"
                  dataKey="bodyFatPct"
                  stroke="#dc2626"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                  name={t("body_fat_label")}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {availableParts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("parts_title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis
                  tick={{ fontSize: 12 }}
                  domain={["auto", "auto"]}
                  label={{
                    value: "cm",
                    angle: -90,
                    position: "insideLeft",
                    style: { fontSize: 12 }
                  }}
                />
                <Tooltip formatter={(v) => (typeof v === "number" ? `${v} cm` : v)} />
                {availableParts.map((part, idx) => (
                  <Line
                    key={part.key}
                    type="monotone"
                    dataKey={part.key}
                    stroke={COLORS[idx % COLORS.length]}
                    strokeWidth={2}
                    dot={{ r: 2 }}
                    activeDot={{ r: 4 }}
                    name={tParts(part.labelKey)}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
