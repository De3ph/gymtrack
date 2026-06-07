"use client";

import dayjs from "dayjs";
import {
  Edit2,
  Trash2,
  Ruler,
  TrendingDown,
  TrendingUp
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

export function BodyMeasurementListItem({
  measurement,
  previous,
  readOnly = false,
  onEdit,
  onDelete
}: BodyMeasurementListItemProps) {
  const t = useTranslations("body_measurement.list");
  const tCommon = useTranslations("common.actions");

  const weightChange = previous
    ? formatChange(measurement.weight, previous.weight, measurement.weightUnit)
    : null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="flex flex-col">
          <CardTitle className="text-base font-semibold">
            {dayjs(measurement.date).format("MMMM D, YYYY")}
          </CardTitle>
          <CardDescription>
            {dayjs(measurement.date).format("HH:mm")}
          </CardDescription>
        </div>
        {!readOnly && isEditableWithinWindow(measurement) && (
          <div className="flex space-x-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit?.(measurement)}
              aria-label={tCommon("edit")}
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete?.(measurement)}
              aria-label={tCommon("delete")}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="secondary" className="text-sm">
            <Ruler className="mr-1 h-3 w-3" />
            {t("weight", {
              value: measurement.weight.toFixed(1),
              unit: measurement.weightUnit
            })}
          </Badge>
          {weightChange && (
            <span
              className={`text-xs flex items-center ${
                weightChange.up ? "text-emerald-600" : "text-rose-600"
              }`}
            >
              {weightChange.up ? (
                <TrendingUp className="mr-1 h-3 w-3" />
              ) : (
                <TrendingDown className="mr-1 h-3 w-3" />
              )}
              {weightChange.text} {t("vs_previous")}
            </span>
          )}
          {typeof measurement.bodyFatPct === "number" &&
            measurement.bodyFatPct > 0 && (
              <Badge variant="outline" className="text-sm">
                {t("body_fat", { value: measurement.bodyFatPct.toFixed(1) })}
              </Badge>
            )}
        </div>
        {measurement.parts && Object.keys(measurement.parts).length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 pt-2 border-t">
            {Object.entries(measurement.parts).map(([key, part]) => (
              <div
                key={key}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-muted-foreground">
                  {t(`part_labels.${key}`, { defaultValue: key })}
                </span>
                <span className="font-medium">{part.value} cm</span>
              </div>
            ))}
          </div>
        )}
        {measurement.notes && (
          <div className="text-sm text-muted-foreground italic border-t pt-2">
            &ldquo;{measurement.notes}&rdquo;
          </div>
        )}
      </CardContent>
    </Card>
  );
}
