"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { History, Loader2, Plus } from "lucide-react";
import { useForm } from "@tanstack/react-form";
import dayjs from "dayjs";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FieldError, FieldLabel } from "@/components/ui/field";
import { bodyMeasurementApi } from "@/lib/api";
import { combineDateTime } from "@/lib/utils/datetime";
import { ApiErrorHandler } from "@/lib/error-handler";
import { BODY_PARTS, DATE_FORMATS } from "@/lib/constants";
import { useTranslations } from "next-intl";
import { revalidateBodyMeasurementsCache } from "@/lib/actions/cache";
import {
  BodyMeasurement,
  BodyMeasurementPart
} from "@/types";
import { bodyMeasurementSchema, BodyMeasurementFormData } from "@/lib/validations/bodyMeasurement";

interface BodyMeasurementFormProps {
  initialMeasurement?: BodyMeasurement;
  onSuccess?: () => void;
  onClear?: () => void;
}

const buildEmptyParts = (): Record<string, BodyMeasurementPart> => ({});

const formatPartsForApi = (
  parts: Record<string, BodyMeasurementPart> | undefined
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
  onClear
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

  const form = useForm({
    defaultValues: {
      date: initialMeasurement?.date
        ? new Date(initialMeasurement.date)
        : new Date(),
      measurementTime: initialMeasurement?.date
        ? dayjs(initialMeasurement.date).format("HH:mm")
        : dayjs().format("HH:mm"),
      weight: initialMeasurement?.weight ?? 0,
      weightUnit: (initialMeasurement?.weightUnit ?? "kg") as "kg" | "lbs",
      bodyFatPct: initialMeasurement?.bodyFatPct ?? undefined,
      parts: (initialMeasurement?.parts
        ? (initialMeasurement.parts as Record<string, BodyMeasurementPart>)
        : buildEmptyParts()) as Record<string, BodyMeasurementPart>,
      notes: initialMeasurement?.notes ?? ""
    } as BodyMeasurementFormData,
    validators: {
      onSubmit: bodyMeasurementSchema
    },
    onSubmit: async ({ value }) => {
      setSubmitError(null);
      saveMeasurement(value);
    }
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
        notes: data.notes
      };
      if (initialMeasurement) {
        return bodyMeasurementApi.update(initialMeasurement.measurementId, payload);
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
      if (onSuccess) onSuccess();
    },
    onError: (error) => {
      const errorMessage = ApiErrorHandler.handle(error);
      setSubmitError(errorMessage);
      console.error("Failed to save body measurement:", errorMessage);
    }
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
        notes: ""
      });
      const map: Record<string, string> = {};
      for (const [k, v] of Object.entries(nextParts)) {
        map[k] = String(v.value ?? "");
      }
      setPartInputs(map);
      setSubmitError(null);
    },
    onError: (error) => {
      const errorMessage = ApiErrorHandler.handle(error);
      setSubmitError(errorMessage);
      console.error("Failed to fetch previous measurement:", errorMessage);
    }
  });

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    form.handleSubmit();
  };

  const handlePartInputChange = (key: string, raw: string) => {
    setPartInputs((prev) => ({ ...prev, [key]: raw }));
  };

  const handlePartBlur = (field: { state: { value: Record<string, BodyMeasurementPart> | undefined }; handleChange: (v: Record<string, BodyMeasurementPart>) => void }, key: string) => {
    const raw = partInputs[key] ?? "";
    const num = parseFloat(raw);
    const current: Record<string, BodyMeasurementPart> =
      field.state.value ?? {};
    if (raw.trim() === "" || !Number.isFinite(num) || num <= 0) {
      const next = { ...current };
      delete next[key];
      field.handleChange(next);
    } else {
      field.handleChange({ ...current, [key]: { value: num } });
    }
  };

  return (
    <form onSubmit={handleFormSubmit} className="w-full space-y-6">
      {submitError && (
        <div
          role="alert"
          data-slot="form-error"
          className="bg-destructive/10 border border-destructive/20 text-destructive p-3 rounded-md"
        >
          {submitError}
        </div>
      )}

      <form.Subscribe
        selector={(state) => ({
          canSubmit: state.canSubmit,
          isSubmitting: state.isSubmitting,
          formErrors: state.errors
        })}
      >
        {({ formErrors }) =>
          Array.isArray(formErrors) && formErrors.length > 0 ? (
            <div
              role="alert"
              data-slot="form-error"
              className="bg-destructive/10 border border-destructive/20 text-destructive p-3 rounded-md"
            >
              <ul className="ml-4 list-disc">
                {formErrors.map((err: unknown, i: number) => (
                  <li key={i}>
                    {typeof err === "string"
                      ? err
                      : (err as { message?: string })?.message ?? "Invalid input"}
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
                <Input
                  value={dayjs(field.state.value).format(DATE_FORMATS.DATE_ONLY)}
                  onChange={(e) =>
                    field.handleChange(dayjs(e.target.value).toDate())
                  }
                  onBlur={field.handleBlur}
                  type="date"
                  id="measurement-date"
                  aria-invalid={!field.state.meta.isValid}
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
          <FieldLabel htmlFor="measurement-weight">{t("weight.label")}</FieldLabel>
          <form.Field name="weight">
            {(field) => (
              <>
                <Input
                  value={field.state.value || ""}
                  onChange={(e) =>
                    field.handleChange(parseFloat(e.target.value) || 0)
                  }
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
              <select
                id="measurement-unit"
                value={field.state.value}
                onChange={(e) =>
                  field.handleChange(e.target.value as "kg" | "lbs")
                }
                onBlur={field.handleBlur}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="kg">kg</option>
                <option value="lbs">lbs</option>
              </select>
            )}
          </form.Field>
        </div>
      </div>

      <div className="flex flex-col space-y-2">
        <FieldLabel htmlFor="measurement-bodyfat">
          {t("body_fat.label")} <span className="text-muted-foreground">({t("body_fat.optional")})</span>
        </FieldLabel>
        <form.Field name="bodyFatPct">
          {(field) => (
            <>
              <Input
                value={field.state.value ?? ""}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === "") {
                    field.handleChange(undefined);
                  } else {
                    const n = parseFloat(raw);
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
        <div className="flex items-center justify-between">
          <FieldLabel>{t("parts.label")}</FieldLabel>
          <span className="text-xs text-muted-foreground">{t("parts.hint")}</span>
        </div>
        <Card>
          <CardContent className="pt-6">
            <form.Field name="parts">
              {(field) => (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {BODY_PARTS.map((part) => (
                    <div
                      key={part.key}
                      className="flex items-center gap-2 min-w-0"
                    >
                      <label
                        htmlFor={`part-${part.key}`}
                        className="text-sm font-medium w-24 shrink-0 truncate"
                      >
                        {t(`parts.${part.labelKey}`)}
                      </label>
                      <Input
                        id={`part-${part.key}`}
                        type="number"
                        step="0.1"
                        min="0"
                        placeholder="cm"
                        value={partInputs[part.key] ?? ""}
                        onChange={(e) =>
                          handlePartInputChange(part.key, e.target.value)
                        }
                        onBlur={() => handlePartBlur(field, part.key)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </form.Field>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col space-y-2">
        <FieldLabel htmlFor="measurement-notes">
          {t("notes.label")} <span className="text-muted-foreground">({t("notes.optional")})</span>
        </FieldLabel>
        <form.Field name="notes">
          {(field) => (
            <>
              <textarea
                id="measurement-notes"
                value={field.state.value ?? ""}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder={t("notes.placeholder")}
                aria-invalid={!field.state.meta.isValid}
              />
              <FieldError errors={field.state.meta.errors} />
            </>
          )}
        </form.Field>
      </div>

      <div className="flex flex-col space-y-4 md:flex-row md:space-x-4 md:space-y-0">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            form.reset();
            setPartInputs({});
            onClear?.();
          }}
          className="w-full md:w-auto"
        >
          {tCommon("clear")}
        </Button>
        {!initialMeasurement && (
          <Button
            type="button"
            variant="outline"
            onClick={() => fetchPrevious()}
            disabled={isFetchingPrevious}
            className="w-full md:w-auto"
          >
            {isFetchingPrevious ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <History className="mr-2 h-4 w-4" />
            )}
            {t("fetch_previous")}
          </Button>
        )}
        <Button
          type="submit"
          disabled={isPending}
          className="w-full md:w-auto md:ml-auto"
        >
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Plus className="mr-2 h-4 w-4" />
          {initialMeasurement ? tCommon("update") : t("submit")}
        </Button>
      </div>
    </form>
  );
}
