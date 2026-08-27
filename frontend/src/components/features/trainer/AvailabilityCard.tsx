import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DAYS_OF_WEEK } from "@/lib/constants";
import { availabilityApi } from "@/lib/api";
import { TrainerAvailability } from "@/types";
import dayjs from "dayjs";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { STALE_TIMES } from "@/lib/api/api-constants";

interface AvailabilityCardProps {
  onMessage: (message: string) => void;
}

export default function AvailabilityCard({ onMessage }: AvailabilityCardProps) {
  const t = useTranslations();
  const [availability, setAvailability] = useState<TrainerAvailability[]>([]);
  const [saving, setSaving] = useState(false);
  const [syncedSlots, setSyncedSlots] = useState<TrainerAvailability[] | undefined>(undefined);

  const { data: availabilityData, isLoading } = useQuery({
    queryKey: ["myAvailability"],
    queryFn: () => availabilityApi.getMyAvailability(),
    staleTime: STALE_TIMES.FIVE_MINUTES,
  });

  // Sync availability data when the query returns. We adjust state during
  // render (guarded by a previous-value check) instead of calling setState in
  // an effect, which avoids cascading re-renders.
  const slots = availabilityData?.slots;
  if (slots && slots !== syncedSlots) {
    setSyncedSlots(slots);
    setAvailability(slots);
  }

  if (isLoading) {
    return (
      <div className="rounded-none border border-border">
        <div className="p-6">
          {t("trainer.availability.loading")}
        </div>
      </div>
    );
  }

  const handleAvailabilitySave = async () => {
    setSaving(true);
    onMessage("");
    try {
      await availabilityApi.setMyAvailability(availability);
      onMessage(t("trainer.availability.saved_success"));
    } catch (error) {
      onMessage(t("trainer.availability.save_failed"));
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const addTimeSlot = (dayOfWeek: number) => {
    const newSlot: TrainerAvailability = {
      availabilityId: 0,
      trainerId: 0,
      dayOfWeek,
      startTime: "09:00",
      endTime: "17:00",
      isBooked: false,
      createdAt: dayjs().toISOString(),
      updatedAt: dayjs().toISOString(),
    };
    setAvailability([...availability, newSlot]);
  };

  const updateSlot = (
    index: number,
    field: keyof TrainerAvailability,
    value: string | number | boolean,
  ) => {
    const updated = [...availability];
    updated[index] = { ...updated[index], [field]: value };
    setAvailability(updated);
  };

  const removeSlot = (index: number) => {
    setAvailability(availability.filter((_, i) => i !== index));
  };
  return (
    <div className="rounded-none border border-border">
      <div className="px-6 py-4 border-b border-border">
        <h3 className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{t(`trainer.availability.title`)}</h3>
      </div>
      <div className="p-6 space-y-4">
        {DAYS_OF_WEEK.map((day, index) => {
          const daySlots = availability.filter((s) => s.dayOfWeek === index);
          return (
            <div key={day} className="border-b border-border pb-4 last:border-0 last:pb-0">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-semibold">
                  {t(`common.date.${day.toLowerCase()}`)}
                </h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addTimeSlot(index)}
                  className="rounded-none"
                >
                  {t(`common.actions.add`)}
                </Button>
              </div>
              {daySlots.map((slot) => {
                const actualIndex = availability.findIndex((s) => s === slot);
                return (
                  <div
                    key={slot.availabilityId}
                    className="flex gap-2 items-center mb-2"
                  >
                    <Input
                      type="time"
                      value={slot.startTime}
                      onChange={(e) =>
                        updateSlot(actualIndex, "startTime", e.target.value)
                      }
                      className="w-32"
                    />
                    <span>{t("trainer.availability.to_label")}</span>
                    <Input
                      type="time"
                      value={slot.endTime}
                      onChange={(e) =>
                        updateSlot(actualIndex, "endTime", e.target.value)
                      }
                      className="w-32"
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => removeSlot(actualIndex)}
                      className="rounded-none"
                    >
                      {t("trainer.availability.remove_slot")}
                    </Button>
                  </div>
                );
              })}
            </div>
          );
        })}
        <div className="flex justify-end">
          <Button onClick={handleAvailabilitySave} disabled={saving} className="rounded-none">
            {saving ? t(`common.actions.saving`) : t(`common.actions.save`)}
          </Button>
        </div>
      </div>
    </div>
  );
}
