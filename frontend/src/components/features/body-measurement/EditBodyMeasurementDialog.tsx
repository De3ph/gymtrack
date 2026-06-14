"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { BodyMeasurement } from "@/types";
import { BodyMeasurementForm } from "./BodyMeasurementForm";
import { useTranslations } from "next-intl";

interface EditBodyMeasurementDialogProps {
  measurement: BodyMeasurement | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditBodyMeasurementDialog({
  measurement,
  open,
  onOpenChange
}: EditBodyMeasurementDialogProps) {
  const t = useTranslations("body_measurement.edit");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-3xl sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        {measurement && (
          <BodyMeasurementForm
            key={measurement.measurementId}
            initialMeasurement={measurement}
            onSuccess={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
