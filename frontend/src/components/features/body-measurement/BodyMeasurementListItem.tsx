"use client";

import { memo } from "react";
import dayjs, { formatDate } from "@/lib/i18n/dayjs";
import {
  Edit2,
  Trash2,
  Ruler,
  TrendingDown,
  TrendingUp
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { TIME_LIMITS } from "@/lib/constants";
import { useTranslations } from "next-intl";
import { BodyMeasurement } from "@/types";

interface BodyMeasurementListItemProps {
  measurement: BodyMeasurement;
  previous?: BodyMeasurement;
  readOnly?: boolean;
  onEdit?: (m: BodyMeasurement) => void;
  onDelete?: (m: BodyMeasurement) => void;
}

const formatChange = (
  current: number,
  previous: number,
  suffix: string
) => {
  const diff = current - previous;
  if (Math.abs(diff) < 0.05) return null;
  const sign = diff > 0 ? "+" : "";
  return { text: `${sign}${diff.toFixed(1)}${suffix}`, up: diff > 0 };
};

const isEditableWithinWindow = (m: BodyMeasurement): boolean => {
  const createdAt = dayjs(m.createdAt);
  return dayjs().diff(createdAt, "hour") < TIME_LIMITS.EDIT_WINDOW_HOURS;
};

export const BodyMeasurementListItem = memo(function BodyMeasurementListItemImpl({
  measurement,
  previous,
  readOnly = false,
  onEdit,
  onDelete
}: BodyMeasurementListItemProps) {
  const t = useTranslations("body_measurement.list");
  const tCommon = useTranslations("common.actions");

  const weightChange = previous
    ? formatChange(
        measurement.weight ?? 0,
        previous.weight ?? 0,
        measurement.weightUnit
      )
    : null;

  return (
    // DESIGN.md §10.1 — hairline panel, no Card primitive
    <div className="border border-border">
      <div className="flex flex-row items-start justify-between gap-4 border-b border-border px-6 py-4 sm:px-8">
        <div className="flex flex-col">
          <span className="font-mono text-sm text-foreground">
            {formatDate(measurement.date, "MMMM D, YYYY")}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatDate(measurement.date, "HH:mm")}
          </span>
        </div>
        {!readOnly && isEditableWithinWindow(measurement) && (
          <div className="flex space-x-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit?.(measurement)}
              aria-label={tCommon("edit")}
            >
              <Edit2 className="size-5" aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete?.(measurement)}
              aria-label={tCommon("delete")}
            >
              <Trash2 className="size-5 text-destructive" aria-hidden="true" />
            </Button>
          </div>
        )}
      </div>
      <div className="space-y-3 px-6 py-4 sm:px-8">
        <div className="flex flex-wrap items-center gap-3">
          <Badge
            variant="secondary"
            className="h-auto rounded-none px-3 py-1.5 text-sm font-medium"
          >
            <Ruler className="mr-1 size-4" aria-hidden="true" />
            <span className="font-mono">
              {t("weight", {
                value: (measurement.weight ?? 0).toFixed(1),
                unit: measurement.weightUnit
              })}
            </span>
          </Badge>
          {weightChange && (
            <span
              className={`flex items-center font-mono text-xs ${
                weightChange.up ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              {weightChange.up ? (
                <TrendingUp className="mr-1 size-4" aria-hidden="true" />
              ) : (
                <TrendingDown className="mr-1 size-4" aria-hidden="true" />
              )}
              {weightChange.text}
              <span className="ml-1 text-muted-foreground">
                {t("vs_previous")}
              </span>
            </span>
          )}
          {typeof measurement.bodyFatPct === "number" &&
            measurement.bodyFatPct > 0 && (
              <Badge
                variant="outline"
                className="h-auto rounded-none px-3 py-1.5 font-mono text-sm font-medium"
              >
                {t("body_fat", { value: measurement.bodyFatPct.toFixed(1) })}
              </Badge>
            )}
        </div>
        {measurement.parts && Object.keys(measurement.parts).length > 0 && (
          <>
            <Separator />
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {Object.entries(measurement.parts).map(([key, part]) => (
                <div
                  key={key}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-muted-foreground">
                    {t(`part_labels.${key}`, { defaultValue: key })}
                  </span>
                  <span className="font-mono">{part.value} cm</span>
                </div>
              ))}
            </div>
          </>
        )}
        {measurement.notes && (
          <>
            <Separator />
            <div className="text-sm text-muted-foreground">
              &ldquo;{measurement.notes}&rdquo;
            </div>
          </>
        )}
      </div>
    </div>
  );
})
