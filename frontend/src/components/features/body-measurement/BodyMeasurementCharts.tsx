"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { formatDate } from "@/lib/i18n/dayjs";
import {
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis
} from "recharts";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig
} from "@/components/ui/chart";
import { Spinner } from "@/components/ui/spinner";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle
} from "@/components/ui/empty";
import { bodyMeasurementApi, trainerClientApi } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import { ApiErrorHandler } from "@/lib/error-handler";
import { DataError } from "@/components/features/DataError";
import { fetchAllPages } from "@/lib/api/fetch-all-pages";
import { BODY_PARTS, PAGINATION } from "@/lib/constants";
import { useTranslations } from "next-intl";
import { BodyMeasurement } from "@/types";
import { BodyMeasurementFilterBar } from "./BodyMeasurementFilterBar";
import type { BodyMeasurementFilter } from "./BodyMeasurementList";
import { toClientDateRange } from "@/components/features/trainer/client-tabs/client-date-range";

interface BodyMeasurementChartsProps {
  measurements?: BodyMeasurement[];
  filter?: BodyMeasurementFilter;
  onFilterChange?: (filter: BodyMeasurementFilter) => void;
  /**
   * Trainer view: fetch the client's full history through the client
   * endpoint. Charts must never be fed a single list page, so `clientUsername`
   * and `clientDateRange` go together — passing the username without a range
   * would silently plot the wrong window.
   */
  clientUsername?: string;
  clientDateRange?: { start: string; end: string };
  /** Keep the query idle until the caller's panel is actually visible. */
  enabled?: boolean;
}

/** Body-part line colors — all from system ramps (chart-* + extensions) */
const COLORS = [
  "var(--chart-1)",      // red
  "var(--chart-2)",      // teal
  "var(--chart-3)",      // amber
  "var(--teal-700)",
  "var(--amber-700)",
  "var(--red-400)",
  "var(--stone-600)",
  "var(--teal-800)",
  "var(--amber-200)",
  "var(--red-800)",
  "var(--stone-400)",
  "var(--teal-900)",
];

interface ChartDataPoint {
  date: string;
  weight?: number;
  bodyFatPct?: number;
  [part: string]: number | string | undefined;
}

const EMPTY_FILTER: BodyMeasurementFilter = {};

/** DESIGN.md §5.2 — strip Card's rounded-xl/shadow/ring defaults */
const CARD_OVERRIDES = "rounded-none border border-border shadow-none ring-0";
const CARD_HEADER_OVERRIDES =
  "rounded-none border-b border-border px-6 py-4 sm:px-8";
const CARD_CONTENT_OVERRIDES = "rounded-none px-6 py-6 sm:px-8";

export function BodyMeasurementCharts({
  measurements: propMeasurements,
  filter: filterProp,
  onFilterChange,
  clientUsername,
  clientDateRange,
  enabled = true,
}: BodyMeasurementChartsProps) {
  const t = useTranslations("body_measurement.charts");
  const tParts = useTranslations("athlete.measurements.parts");

  const [internalFilter, setInternalFilter] = React.useState<BodyMeasurementFilter>(EMPTY_FILTER);
  const filter = filterProp ?? internalFilter;

  const handleFilterChange = React.useCallback(
    (next: BodyMeasurementFilter) => {
      if (onFilterChange) onFilterChange(next);
      else setInternalFilter(next);
    },
    [onFilterChange],
  );

  // Two independent modes: trainer client history (clientUsername + range
  // together) or the signed-in athlete's own history. A missing range in
  // client mode falls back to the unfiltered history rather than plotting a
  // stale local filter.
  const isClientMode = Boolean(clientUsername);
  const fetchesRemote = !propMeasurements;

  const range = isClientMode
    ? toClientDateRange(clientDateRange ?? { start: "", end: "" })
    : { startDate: filter.startDate, endDate: filter.endDate };

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: isClientMode
      ? qk.measurements.clientCharts(clientUsername!, {
          startDate: range.startDate,
          endDate: range.endDate
        })
      : qk.measurements.charts({
          startDate: range.startDate,
          endDate: range.endDate
        }),
    queryFn: () => {
      const fetchPage = isClientMode
        ? (offset: number, limit: number) =>
            trainerClientApi
              .getClientMeasurements(clientUsername!, {
                limit,
                offset,
                startDate: range.startDate,
                endDate: range.endDate
              })
              .then((res) => ({ items: res.measurements, count: res.count }))
        : (offset: number, limit: number) =>
            bodyMeasurementApi
              .getAll({
                limit,
                offset,
                startDate: range.startDate,
                endDate: range.endDate
              })
              .then((res) => ({ items: res.measurements, count: res.count }));

      return fetchAllPages(fetchPage, PAGINATION.BODY_MEASUREMENT_CHART_LIMIT);
    },
    enabled: fetchesRemote && enabled
  });

  // Derive the chart dataset once per data change so recharts doesn't
  // re-process identical data on unrelated re-renders. These hooks must
  // run before any early return to satisfy the rules of hooks.
  const raw = React.useMemo(
    () => propMeasurements || data || [],
    [propMeasurements, data],
  );

  // Sort ascending by date for charts
  const sorted = React.useMemo(
    () =>
      [...raw].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      ),
    [raw],
  );

  const chartData = React.useMemo<ChartDataPoint[]>(
    () =>
      sorted.map((m) => {
        const point: ChartDataPoint = {
          date: formatDate(m.date)
        };
        // Convert to kg for chart consistency - m.weight is optional in generated type
        const weight = m.weight ?? 0;
        point.weight =
          m.weightUnit === "lbs" ? weight * 0.453592 : weight;
        if (typeof m.bodyFatPct === "number" && m.bodyFatPct > 0) {
          point.bodyFatPct = m.bodyFatPct;
        }
        if (m.parts) {
          for (const [k, v] of Object.entries(m.parts)) {
            point[k] = v.value;
          }
        }
        return point;
      }),
    [sorted],
  );

  const availableParts = React.useMemo(
    () =>
      BODY_PARTS.filter((p) => chartData.some((d) => typeof d[p.key] === "number")),
    [chartData],
  );

  if (isLoading && fetchesRemote) {
    return (
      <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
        <Spinner />
        {t("loading")}
      </div>
    );
  }

  // The client-detail tabs own the filters, so the bar is athlete-only.
  const filterBar =
    fetchesRemote && !isClientMode ? (
      <BodyMeasurementFilterBar
        filter={filter}
        onChange={handleFilterChange}
      />
    ) : null;

  if (fetchesRemote && error) {
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

  if (raw.length === 0) {
    return (
      <div className="space-y-4">
        {filterBar}
        <Empty className="rounded-none border border-border">
          <EmptyHeader>
            <EmptyTitle className="font-mono text-xs uppercase tracking-[0.18em]">
              {t("no_data")}
            </EmptyTitle>
            <EmptyDescription>
              {t("weight_label")} · {t("body_fat_label")}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  const weightConfig = {
    weight: {
      label: `${t("weight_label")} (kg)`,
      color: "var(--chart-1)",
    },
  } satisfies ChartConfig;

  return (
    <div className="space-y-6">
      {filterBar}

      <Card className={CARD_OVERRIDES}>
        <CardHeader className={CARD_HEADER_OVERRIDES}>
          <CardTitle className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {t("weight_title")}
          </CardTitle>
        </CardHeader>
        <CardContent className={CARD_CONTENT_OVERRIDES}>
          <ChartContainer
            config={weightConfig}
            className="aspect-auto h-[280px] w-full"
          >
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
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) =>
                      typeof value === "number"
                        ? `${value.toFixed(1)} kg`
                        : String(value)
                    }
                  />
                }
              />
              <Line
                type="monotone"
                dataKey="weight"
                stroke="var(--chart-1)"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
                name={t("weight_label")}
              />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {chartData.some((d) => typeof d.bodyFatPct === "number") && (
        <Card className={CARD_OVERRIDES}>
          <CardHeader className={CARD_HEADER_OVERRIDES}>
            <CardTitle className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              {t("body_fat_title")}
            </CardTitle>
          </CardHeader>
          <CardContent className={CARD_CONTENT_OVERRIDES}>
            <ChartContainer
              config={{
                bodyFatPct: {
                  label: `${t("body_fat_label")} (%)`,
                  color: "var(--chart-2)",
                },
              }}
              className="aspect-auto h-[240px] w-full"
            >
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
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) =>
                        typeof value === "number"
                          ? `${value.toFixed(1)}%`
                          : String(value)
                      }
                    />
                  }
                />
                <Line
                  type="monotone"
                  dataKey="bodyFatPct"
                  stroke="var(--chart-2)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                  name={t("body_fat_label")}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {availableParts.length > 0 && (
        <Card className={CARD_OVERRIDES}>
          <CardHeader className={CARD_HEADER_OVERRIDES}>
            <CardTitle className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              {t("parts_title")}
            </CardTitle>
          </CardHeader>
          <CardContent className={CARD_CONTENT_OVERRIDES}>
            <ChartContainer
              config={Object.fromEntries(
                availableParts.map((part, idx) => [
                  part.key,
                  {
                    label: `${tParts(part.labelKey)} (cm)`,
                    color: COLORS[idx % COLORS.length],
                  },
                ]),
              )}
              className="aspect-auto h-[320px] w-full"
            >
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
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) =>
                        typeof value === "number" ? `${value} cm` : String(value)
                      }
                    />
                  }
                />
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
            </ChartContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
