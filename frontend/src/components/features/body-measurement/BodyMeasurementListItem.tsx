"use client";

import { memo, useId } from "react";
import dayjs, { formatDate } from "@/lib/i18n/dayjs";
import {
  Edit2,
  Trash2,
  Ruler,
  TrendingDown,
  TrendingUp,
  ChevronDown,
} from "lucide-react";
import {
  AnimatePresence,
  type Transition,
  useReducedMotion,
} from "motion/react";
import * as m from "motion/react-m";

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
  /** Whether the detail section (body parts, notes) is hidden. */
  isCollapsed: boolean;
  /** Toggles the detail section. */
  onToggle: () => void;
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
  onDelete,
  isCollapsed,
  onToggle,
}: BodyMeasurementListItemProps) {
  const t = useTranslations("body_measurement.list");
  const tCommon = useTranslations("common.actions");
  const reduce = useReducedMotion();
  const collapseTransition: Transition = reduce
    ? { duration: 0 }
    : { duration: 0.2, ease: [0.23, 1, 0.32, 1] };

  const weightChange = previous
    ? formatChange(
        measurement.weight ?? 0,
        previous.weight ?? 0,
        measurement.weightUnit
      )
    : null;

  const parts = measurement.parts ? Object.entries(measurement.parts) : [];
  const hasDetails = parts.length > 0 || Boolean(measurement.notes);
  const fallbackId = useId();
  const bodyId = `measurement-card-body-${
    measurement.measurementId ?? fallbackId
  }`;

  const summary = (
    <span className="flex min-w-0 flex-col">
      <span className="font-mono text-sm text-foreground">
        {formatDate(measurement.date, "MMMM D, YYYY")}
      </span>
      <span className="text-xs text-muted-foreground">
        {formatDate(measurement.date, "HH:mm")}
      </span>
    </span>
  );

  return (
    // DESIGN.md §10.1 — hairline panel, no Card primitive
    <div className="border border-border">
      <div className="px-6 py-4 sm:px-8">
        <div className="flex flex-row items-start justify-between gap-4">
          {hasDetails ? (
            <button
              type="button"
              onClick={onToggle}
              aria-expanded={!isCollapsed}
              aria-controls={bodyId}
              aria-label={isCollapsed ? "Expand measurement" : "Collapse measurement"}
              className="flex min-w-0 flex-1 flex-row items-center justify-between gap-3 rounded-none text-left outline-none transition-colors hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {summary}
              <m.span
                className="flex shrink-0 text-muted-foreground"
                animate={{ rotate: isCollapsed ? 0 : 180 }}
                transition={collapseTransition}
              >
                <ChevronDown className="size-4" aria-hidden="true" />
              </m.span>
            </button>
          ) : (
            <div className="min-w-0 flex-1">{summary}</div>
          )}

          {!readOnly && isEditableWithinWindow(measurement) && (
            <div className="flex shrink-0 space-x-1">
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

        <div className="mt-3 flex flex-wrap items-center gap-3">
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
      </div>

      <AnimatePresence initial={false}>
        {!isCollapsed && hasDetails && (
          <m.div
            key="body"
            id={bodyId}
            className="overflow-hidden border-t border-border"
            initial={reduce ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduce ? undefined : { height: 0, opacity: 0 }}
            transition={collapseTransition}
          >
            <div className="space-y-3 px-6 py-4 sm:px-8">
              {parts.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {parts.map(([key, part]) => (
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
              )}
              {measurement.notes && (
                <>
                  {parts.length > 0 && <Separator />}
                  <div className="text-sm text-muted-foreground">
                    &ldquo;{measurement.notes}&rdquo;
                  </div>
                </>
              )}
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
})
