"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDate } from "@/lib/i18n/dayjs";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { bodyMeasurementApi } from "@/lib/api";
import { ApiErrorHandler } from "@/lib/error-handler";
import { BodyMeasurement } from "@/types";
import { useTranslations } from "next-intl";
import { revalidateBodyMeasurementsCache } from "@/lib/actions/cache";
import { qk } from "@/lib/query-keys";

interface DeleteBodyMeasurementDialogProps {
  measurement: BodyMeasurement | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteBodyMeasurementDialog({
  measurement,
  open,
  onOpenChange
}: DeleteBodyMeasurementDialogProps) {
  const queryClient = useQueryClient();
  const t = useTranslations("body_measurement.delete");

  const { mutate: deleteMeasurement, isPending } = useMutation({
    mutationFn: async (id: number) => bodyMeasurementApi.delete(id),
    onSuccess: async () => {
      await revalidateBodyMeasurementsCache();
      queryClient.invalidateQueries({ queryKey: qk.measurements.all });
      onOpenChange(false);
    },
    onError: (error) => {
      const msg = ApiErrorHandler.handle(error);
      console.error("Failed to delete body measurement:", msg);
    }
  });

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="rounded-none border border-border shadow-none">
        <AlertDialogHeader>
          <AlertDialogTitle>{t("title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {measurement
              ? t("description", {
                  date: formatDate(measurement.date, "MMMM D, YYYY")
                })
              : t("description_generic")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>
            {t("cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              if (measurement && measurement.measurementId != null) {
                deleteMeasurement(measurement.measurementId);
              }
            }}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {t("confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
