import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DAYS_OF_WEEK } from "@/lib/constants";
import { availabilityApi } from "@/lib/api";
import { TrainerAvailability } from "@/types";
import dayjs from "dayjs";
import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";

interface AvailabilityCardProps {
  onMessage: (message: string) => void;
}

export default function AvailabilityCard({ onMessage }: AvailabilityCardProps) {
  const t = useTranslations();
  const [availability, setAvailability] = useState<TrainerAvailability[]>([]);
  const [saving, setSaving] = useState(false);

  const { data: availabilityData, isLoading } = useQuery({
    queryKey: ["myAvailability"],
    queryFn: () => availabilityApi.getMyAvailability(),
    staleTime: 5 * 60 * 1000,
  });

  // Sync availability data when query returns
  useEffect(() => {
    if (availabilityData?.slots) {
      setAvailability(availabilityData.slots);
    }
  }, [availabilityData]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">Loading availability...</CardContent>
      </Card>
    );
  }

  const handleAvailabilitySave = async () => {
    setSaving(true);
    onMessage("");
    try {
      await availabilityApi.setMyAvailability(availability);
      onMessage("Availability saved successfully!");
    } catch (error) {
      onMessage("Failed to save availability");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const addTimeSlot = (dayOfWeek: number) => {
    const newSlot: TrainerAvailability = {
      availabilityId: `new-${dayjs().valueOf()}`,
      trainerId: "",
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
    <Card>
      <CardHeader>
        <CardTitle>{t(`trainer.availability.title`)}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {DAYS_OF_WEEK.map((day, index) => {
          const daySlots = availability.filter((s) => s.dayOfWeek === index);
          return (
            <div key={day} className="border-b pb-4 last:border-0">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-medium">
                  {t(`common.date.${day.toLowerCase()}`)}
                </h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addTimeSlot(index)}
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
                    <span>to</span>
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
                    >
                      X
                    </Button>
                  </div>
                );
              })}
            </div>
          );
        })}
        <div className="flex justify-end">
          <Button onClick={handleAvailabilitySave} disabled={saving}>
            {saving ? t(`common.actions.saving`) : t(`common.actions.save`)}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
