"use client";

import { DashboardActionButton } from "@/components/features/dashboard/DashboardActionButton";
import { ROUTES } from "@/lib/routes";
import { CalendarDays, Dumbbell, UtensilsCrossed } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

export function QuickActionsPanel() {
  const router = useRouter();
  const tAthlete = useTranslations("athlete.dashboard");

  return (
    <div className="border border-border bg-card">
      <div className="grid grid-rows-2 grid-cols-2 gap-3 p-6 sm:px-8">
        <DashboardActionButton
          icon={<Dumbbell className="size-5" aria-hidden="true" />}
          label={tAthlete("log_workout")}
          description={tAthlete("log_workout_description")}
          onClick={() => router.push(ROUTES.ATHLETE_WORKOUTS)}
        />
        <DashboardActionButton
          icon={<UtensilsCrossed className="size-5" aria-hidden="true" />}
          label={tAthlete("log_meal")}
          description={tAthlete("log_meal_description")}
          onClick={() => router.push(ROUTES.ATHLETE_MEALS)}
        />
        <DashboardActionButton
          icon={<CalendarDays className="size-5" aria-hidden="true" />}
          label={tAthlete("calendar")}
          description={tAthlete("calendar_description")}
          onClick={() => router.push(ROUTES.ATHLETE_WORKOUTS)}
        />
      </div>
    </div>
  );
}
