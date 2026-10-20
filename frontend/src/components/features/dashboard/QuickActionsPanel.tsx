"use client";

import { GlowHoverCard } from "@/components/shadcn-studio/card/glow-hover-card";
import { BentoGrid } from "@/components/ui/bento-grid";
import { ROUTES } from "@/lib/routes";
import { CalendarDays, Dumbbell, UtensilsCrossed } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

export function QuickActionsPanel() {
  const router = useRouter();
  const tAthlete = useTranslations("athlete.dashboard");

  return (
    <div className="border border-border bg-card">
      <BentoGrid
        columns={2}
        density="compact"
        className="grid-cols-2 auto-rows-auto p-4 sm:px-8"
      >
        <GlowHoverCard
          title={tAthlete("log_workout")}
          icon={<Dumbbell className="size-4" aria-hidden="true" />}
          cardClassName="w-full max-w-none"
          onClick={() => router.push(ROUTES.ATHLETE_WORKOUTS)}
        />
        <GlowHoverCard
          title={tAthlete("log_meal")}
          icon={<UtensilsCrossed className="size-4" aria-hidden="true" />}
          cardClassName="w-full max-w-none"
          onClick={() => router.push(ROUTES.ATHLETE_MEALS)}
        />
        <GlowHoverCard
          title={tAthlete("calendar")}
          icon={<CalendarDays className="size-4" aria-hidden="true" />}
          cardClassName="w-full max-w-none"
          onClick={() => router.push(ROUTES.ATHLETE_WORKOUTS)}
        />
      </BentoGrid>
    </div>
  );
}
