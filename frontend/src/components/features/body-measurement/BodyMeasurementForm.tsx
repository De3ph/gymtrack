"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { History, Plus } from "lucide-react";
import { useForm } from "@tanstack/react-form";
import dayjs from "dayjs";
import { formatDate } from "@/lib/i18n/dayjs";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { FieldError, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { bodyMeasurementApi } from "@/lib/api";
import { combineDateTime } from "@/lib/utils/datetime";
import { ApiErrorHandler } from "@/lib/error-handler";
import { BODY_PARTS } from "@/lib/constants";
import { useTranslations } from "next-intl";
import { revalidateBodyMeasurementsCache } from "@/lib/actions/cache";
import { BodyMeasurement, BodyMeasurementPart } from "@/types";
import {
  bodyMeasurementSchema,
  BodyMeasurementFormData,
} from "@/lib/validations/bodyMeasurement";

interface BodyMeasurementFormProps {
  initialMeasurement?: BodyMeasurement;
  onSuccess?: () => void;
  onClear?: () => void;
}

const sanitizeNumericInput = (raw: string): string =>
  raw.replace(/[^\d.]/g, "");

const buildEmptyParts = (): Record<string, BodyMeasurementPart> => ({});

const formatPartsForApi = (
  parts: Record<string, BodyMeasurementPart> | undefined,
): Record<string, BodyMeasurementPart> => {
  const out: Record<string, BodyMeasurementPart> = {};
  if (!parts) return out;
  for (const [key, part] of Object.entries(parts)) {
    if (part && Number.isFinite(part.value) && part.value > 0) {
      out[key] = { value: part.value };
    }
  }
  return out;
};

export function BodyMeasurementForm({
  initialMeasurement,
  onSuccess,
  onClear,
}: BodyMeasurementFormProps) {
  const queryClient = useQueryClient();
  const t = useTranslations("athlete.measurements");
  const tCommon = useTranslations("common.actions");
  const [partInputs, setPartInputs] = useState<Record<string, string>>(() => {
    if (initialMeasurement?.parts) {
      const map: Record<string, string> = {};
      for (const [k, v] of Object.entries(initialMeasurement.parts)) {
        map[k] = String(v.value ?? "");
      }
      return map;
    }
    return {};
  });
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [partErrors, setPartErrors] = useState<Record<string, string | null>>(
    {},
  );

  const form = useForm({
    defaultValues: {
      date: initialMeasurement?.date
        ? new Date(initialMeasurement.date)
        : new Date(),
      measurementTime: initialMeasurement?.date
        ? formatDate(new Date(initialMeasurement.date), "HH:mm")
        : formatDate(new Date(), "HH:mm"),
      weight: initialMeasurement?.weight ?? 0,
      weightUnit: (initialMeasurement?.weightUnit ?? "kg") as "kg" | "lbs",
      bodyFatPct: initialMeasurement?.bodyFatPct ?? undefined,
      parts: (initialMeasurement?.parts
        ? (initialMeasurement.parts as Record<string, BodyMeasurementPart>)
        : buildEmptyParts()) as Record<string, BodyMeasurementPart>,
      notes: initialMeasurement?.notes ?? "",
    } as BodyMeasurementFormData,
    validators: {
      onSubmit: bodyMeasurementSchema,
    },
    onSubmit: async ({ value }) => {
      setSubmitError(null);
      saveMeasurement(value);
    },
  });

  const { mutate: saveMeasurement, isPending } = useMutation({
    mutationFn: async (data: BodyMeasurementFormData) => {
      const combinedDate = combineDateTime(data.date, data.measurementTime);
      const payload = {
        date: combinedDate,
        weight: data.weight,
        weightUnit: data.weightUnit,
        bodyFatPct: data.bodyFatPct,
        parts: formatPartsForApi(data.parts),
        notes: data.notes,
      };
      if (initialMeasurement) {
        return bodyMeasurementApi.update(
          initialMeasurement.measurementId,
          payload,
        );
      }
      return bodyMeasurementApi.create(payload);
    },
    onSuccess: async () => {
      await revalidateBodyMeasurementsCache();
      queryClient.invalidateQueries({ queryKey: ["body-measurements"] });
      queryClient.invalidateQueries({ queryKey: ["latest-body-measurement"] });
      queryClient.invalidateQueries({ queryKey: ["client-measurements"] });
      form.reset();
      setPartInputs({});
      setPartErrors({});
      if (onSuccess) onSuccess();
    },
    onError: (error) => {
      const errorMessage = ApiErrorHandler.handle(error);
      setSubmitError(errorMessage);
      console.error("Failed to save body measurement:", errorMessage);
    },
  });

  const { mutate: fetchPrevious, isPending: isFetchingPrevious } = useMutation({
    mutationFn: () => bodyMeasurementApi.getLatest(),
    onSuccess: (latest) => {
      const nextParts: Record<string, BodyMeasurementPart> =
        (latest.parts as Record<string, BodyMeasurementPart>) ?? {};
      form.reset({
        date: new Date(latest.date),
        measurementTime: dayjs(latest.date).format("HH:mm"),
        weight: latest.weight,
        weightUnit: latest.weightUnit,
        bodyFatPct: latest.bodyFatPct ?? undefined,
        parts: nextParts,
        notes: "",
      });
      const map: Record<string, string> = {};
      for (const [k, v] of Object.entries(nextParts)) {
        map[k] = String(v.value ?? "");
      }
      setPartInputs(map);
      setPartErrors({});
      setSubmitError(null);
    },
    onError: (error) => {
      const errorMessage = ApiErrorHandler.handle(error);
      setSubmitError(errorMessage);
      console.error("Failed to fetch previous measurement:", errorMessage);
    },
  });

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    form.handleSubmit();
  };

  const handlePartInputChange = (key: string, raw: string) => {
    setPartInputs((prev) => ({ ...prev, [key]: sanitizeNumericInput(raw) }));
  };

  const handlePartBlur = (
    field: {
      state: { value: Record<string, BodyMeasurementPart> | undefined };
      handleChange: (v: Record<string, BodyMeasurementPart>) => void;
    },
    key: string,
  ) => {
    const raw = partInputs[key] ?? "";
    const num = parseFloat(raw);
    const current: Record<string, BodyMeasurementPart> =
      field.state.value ?? {};
    if (raw.trim() === "" || !Number.isFinite(num) || num <= 0) {
      const next = { ...current };
      delete next[key];
      field.handleChange(next);
      setPartErrors((prev) => ({
        ...prev,
        [key]: raw.trim() === "" ? null : t("parts.invalid"),
      }));
    } else {
      field.handleChange({ ...current, [key]: { value: num } });
      setPartErrors((prev) => ({ ...prev, [key]: null }));
    }
  };

  return (
    <form onSubmit={handleFormSubmit} className="w-full space-y-6">
      {submitError && (
        <div
          role="alert"
          data-slot="form-error"
          className="rounded-none bg-destructive/10 border border-destructive/20 text-destructive p-3"
        >
          {submitError}
        </div>
      )}

      <form.Subscribe
        selector={(state) => ({
          canSubmit: state.canSubmit,
          isSubmitting: state.isSubmitting,
          formErrors: state.errors,
        })}
      >
        {({ formErrors }) =>
          Array.isArray(formErrors) && formErrors.length > 0 ? (
            <div
              role="alert"
              data-slot="form-error"
              className="rounded-none bg-destructive/10 border border-destructive/20 text-destructive p-3"
            >
              <ul className="ml-4 list-disc">
                {formErrors.map((err: unknown, i: number) => (
                  <li key={i}>
                    {typeof err === "string"
                      ? err
                      : ((err as { message?: string })?.message ??
                      "Invalid input")}
                  </li>
                ))}
              </ul>
            </div>
          ) : null
        }
      </form.Subscribe>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="flex flex-col space-y-2">
          <FieldLabel htmlFor="measurement-date">{t("date.label")}</FieldLabel>
          <form.Field name="date">
            {(field) => (
              <>
                <DatePicker
                  value={field.state.value}
                  onChange={(d) => {
                    if (d) field.handleChange(d);
                  }}
                  onBlur={field.handleBlur}
                  id="measurement-date"
                  aria-invalid={!field.state.meta.isValid}
                  required
                />
                <FieldError errors={field.state.meta.errors} />
              </>
            )}
          </form.Field>
        </div>
        <div className="flex flex-col space-y-2">
          <FieldLabel htmlFor="measurement-time">{t("time.label")}</FieldLabel>
          <form.Field name="measurementTime">
            {(field) => (
              <>
                <Input
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  type="time"
                  id="measurement-time"
                  aria-invalid={!field.state.meta.isValid}
                />
                <FieldError errors={field.state.meta.errors} />
              </>
            )}
          </form.Field>
        </div>
        <div className="flex flex-col space-y-2">
          <FieldLabel htmlFor="measurement-weight">
            {t("weight.label")}
          </FieldLabel>
          <form.Field
            name="weight"
            validators={{ onBlur: bodyMeasurementSchema.shape.weight }}
          >
            {(field) => (
              <>
                <Input
                  value={field.state.value || ""}
                  onChange={(e) => {
                    const clean = sanitizeNumericInput(e.target.value);
                    field.handleChange(clean === "" ? 0 : parseFloat(clean));
                  }}
                  onBlur={field.handleBlur}
                  type="number"
                  step="0.1"
                  min="0"
                  id="measurement-weight"
                  placeholder="0.0"
                  aria-invalid={!field.state.meta.isValid}
                />
                <FieldError errors={field.state.meta.errors} />
              </>
            )}
          </form.Field>
        </div>
        <div className="flex flex-col space-y-2">
          <FieldLabel htmlFor="measurement-unit">{t("unit.label")}</FieldLabel>
          <form.Field name="weightUnit">
            {(field) => (
              <Select
                value={field.state.value}
                onValueChange={(value) =>
                  field.handleChange(value as "kg" | "lbs")
                }
              >
                <SelectTrigger id="measurement-unit" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kg">kg</SelectItem>
                  <SelectItem value="lbs">lbs</SelectItem>
                </SelectContent>
              </Select>
            )}
          </form.Field>
        </div>
      </div>

      <div className="flex flex-col space-y-2">
        <FieldLabel htmlFor="measurement-bodyfat">
          {t("body_fat.label")}{" "}
          <span className="text-muted-foreground">
            ({t("body_fat.optional")})
          </span>
        </FieldLabel>
        <form.Field
          name="bodyFatPct"
          validators={{ onBlur: bodyMeasurementSchema.shape.bodyFatPct }}
        >
          {(field) => (
            <>
              <Input
                value={field.state.value ?? ""}
                onChange={(e) => {
                  const clean = sanitizeNumericInput(e.target.value);
                  if (clean === "") {
                    field.handleChange(undefined);
                  } else {
                    const n = parseFloat(clean);
                    field.handleChange(Number.isFinite(n) ? n : undefined);
                  }
                }}
                onBlur={field.handleBlur}
                type="number"
                step="0.1"
                min="0"
                max="100"
                id="measurement-bodyfat"
                placeholder="%"
                className="max-w-[180px]"
                aria-invalid={!field.state.meta.isValid}
              />
              <FieldError errors={field.state.meta.errors} />
            </>
          )}
        </form.Field>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <FieldLabel>{t("parts.label")}</FieldLabel>
          <span className="text-xs text-muted-foreground">
            {t("parts.hint")}
          </span>
        </div>
        {/* DESIGN.md §10.1 — hairline panel, no Card primitive */}
        <div className="rounded-none border border-border p-4 sm:p-6">
          <form.Field name="parts">
            {(field) => {
              // Group paired parts (left/right) side by side; single parts take full cell.
              // Each cell follows the form-wide "label above input" pattern so nothing
              // overflows narrow grid cells.
              const renderPartInput = (key: string) => (
                <Input
                  id={`part-${key}`}
                  inputMode="decimal"
                  pattern="[0-9]*"
                  min="0"
                  step={undefined}
                  placeholder="cm"
                  value={partInputs[key] ?? ""}
                  onChange={(e) => handlePartInputChange(key, e.target.value)}
                  onBlur={() => handlePartBlur(field, key)}
                />
              );
              const pairedKeys = new Set([
                "bicepLeft",
                "bicepRight",
                "forearmLeft",
                "forearmRight",
                "thighLeft",
                "thighRight",
                "calfLeft",
                "calfRight",
              ]);
              const rendered = new Set<string>();
              const partsRows = BODY_PARTS.map((part) => {
                if (rendered.has(part.key)) return null;
                if (!pairedKeys.has(part.key)) {
                  // Single part - render alone
                  rendered.add(part.key);
                  return (
                    <div key={part.key} className="flex flex-col gap-2 min-w-0">
                      <FieldLabel htmlFor={`part-${part.key}`}>
                        {t(`parts.${part.labelKey}`)}
                      </FieldLabel>
                      {renderPartInput(part.key)}
                      <FieldError
                        errors={
                          partErrors[part.key]
                            ? [{ message: partErrors[part.key] as string }]
                            : []
                        }
                      />
                    </div>
                  );
                }
                // Paired part (e.g. bicepLeft) - render both left + right together
                const pairKey = part.key;
                const partnerKey = pairKey.replace(
                  /Left|Right$/,
                  (m) => (m === "Left" ? "Right" : "Left"),
                );
                rendered.add(pairKey);
                rendered.add(partnerKey);
                const labelFor = (key: string) => {
                  const def = BODY_PARTS.find((p) => p.key === key);
                  return def ? t(`parts.${def.labelKey}`) : "";
                };
                const sides = [
                  {
                    key: pairKey,
                    label: labelFor(pairKey),
                    error: partErrors[pairKey],
                  },
                  {
                    key: partnerKey,
                    label: labelFor(partnerKey),
                    error: partErrors[partnerKey],
                  },
                ];
                return (
                  <div key={pairKey} className="grid grid-cols-2 gap-4">
                    {sides.map((side) => (
                      <div
                        key={side.key}
                        className="flex flex-col gap-2 min-w-0"
                      >
                        <FieldLabel
                          htmlFor={`part-${side.key}`}
                          className="truncate"
                          title={side.label}
                        >
                          {side.label}
                        </FieldLabel>
                        {renderPartInput(side.key)}
                        <FieldError
                          errors={side.error ? [{ message: side.error }] : []}
                        />
                      </div>
                    ))}
                  </div>
                );
              }).filter(Boolean) as React.ReactNode[];

              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {partsRows}
                </div>
              );
            }}
          </form.Field>
        </div>
      </div>

      <div className="flex flex-col space-y-2">
        <FieldLabel htmlFor="measurement-notes">
          {t("notes.label")}{" "}
          <span className="text-muted-foreground">({t("notes.optional")})</span>
        </FieldLabel>
        <form.Field name="notes">
          {(field) => (
            <>
              <Textarea
                id="measurement-notes"
                data-testid="measurement-notes"
                value={field.state.value ?? ""}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                className="min-h-[80px] rounded-none"
                placeholder={t("notes.placeholder")}
                aria-invalid={!field.state.meta.isValid}
              />
              <FieldError errors={field.state.meta.errors} />
            </>
          )}
        </form.Field>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            form.reset();
            setPartInputs({});
            setPartErrors({});
            onClear?.();
          }}
          className="w-full rounded-none sm:w-auto"
        >
          {tCommon("clear")}
        </Button>
        {!initialMeasurement && (
          <Button
            type="button"
            variant="outline"
            onClick={() => fetchPrevious()}
            disabled={isFetchingPrevious}
            className="w-full rounded-none sm:w-auto"
          >
            {isFetchingPrevious ? (
              <Spinner />
            ) : (
              <History className="size-5" aria-hidden="true" />
            )}
            {t("fetch_previous")}
          </Button>
        )}
        <Button
          type="submit"
          disabled={isPending}
          className="w-full rounded-none sm:w-auto sm:ml-auto"
        >
          {isPending && <Spinner />}
          <Plus className="size-5" aria-hidden="true" />
          {initialMeasurement ? tCommon("update") : t("submit")}
        </Button>
      </div>
    </form>
  );
}