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
      <header className="border-b border-border px-6 py-4 sm:px-8">
        <h2 className="font-sans text-base font-semibold leading-tight text-foreground">
          {tAthlete("quick_title")}
        </h2>
        <p className="mt-1 font-sans text-sm leading-6 text-muted-foreground">
          {tAthlete("quick_description")}
        </p>
      </header>
      <div className="grid gap-3 p-6 sm:px-8">
        <DashboardActionButton
          icon={<Dumbbell className="size-4" aria-hidden="true" />}
          label={tAthlete("log_workout")}
          description={tAthlete("log_workout_description")}
          onClick={() => router.push(ROUTES.ATHLETE_WORKOUTS)}
        />
        <DashboardActionButton
          icon={<UtensilsCrossed className="size-4" aria-hidden="true" />}
          label={tAthlete("log_meal")}
          description={tAthlete("log_meal_description")}
          onClick={() => router.push(ROUTES.ATHLETE_MEALS)}
        />
        <DashboardActionButton
          icon={<CalendarDays className="size-4" aria-hidden="true" />}
          label={tAthlete("calendar")}
          description={tAthlete("calendar_description")}
          onClick={() => router.push(ROUTES.ATHLETE_WORKOUTS)}
        />
      </div>
    </div>
  );
}
