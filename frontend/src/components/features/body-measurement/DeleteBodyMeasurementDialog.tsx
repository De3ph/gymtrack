"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";

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
    mutationFn: async (id: string) => bodyMeasurementApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["body-measurements"] });
      queryClient.invalidateQueries({ queryKey: ["latest-body-measurement"] });
      queryClient.invalidateQueries({ queryKey: ["client-measurements"] });
      onOpenChange(false);
    },
    onError: (error) => {
      const msg = ApiErrorHandler.handle(error);
      console.error("Failed to delete body measurement:", msg);
    }
  });

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {measurement
              ? t("description", {
                  date: dayjs(measurement.date).format("MMMM D, YYYY")
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
              if (measurement) deleteMeasurement(measurement.measurementId);
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
