"use client";

import { DashboardActionButton } from "@/components/features/dashboard/DashboardActionButton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ROUTES } from "@/lib/routes";
import { User } from "@/types";
import {
  CalendarDays,
  Dumbbell,
  User as UserIcon,
  UtensilsCrossed,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

interface QuickActionsPanelProps {
  activeTrainer?: User | null;
}

export function QuickActionsPanel({ activeTrainer }: QuickActionsPanelProps) {
  const router = useRouter();
  const tAthlete = useTranslations("athlete.dashboard");

  return (
    <Card className="rounded-[1.5rem]">
      <CardHeader>
        <CardTitle>{tAthlete("quick_title")}</CardTitle>
        <CardDescription>{tAthlete("quick_description")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <DashboardActionButton
          icon={<Dumbbell className="h-4 w-4" />}
          label={tAthlete("log_workout")}
          description={tAthlete("log_workout_description")}
          onClick={() => router.push(ROUTES.ATHLETE_WORKOUTS)}
        />
        <DashboardActionButton
          icon={<UtensilsCrossed className="h-4 w-4" />}
          label={tAthlete("log_meal")}
          description={tAthlete("log_meal_description")}
          onClick={() => router.push(ROUTES.ATHLETE_MEALS)}
        />
        <DashboardActionButton
          icon={<CalendarDays className="h-4 w-4" />}
          label={tAthlete("calendar")}
          description={tAthlete("calendar_description")}
          onClick={() => router.push(ROUTES.ATHLETE_WORKOUTS)}
        />
        {activeTrainer ? (
          <DashboardActionButton
            icon={<UserIcon className="h-4 w-4" />}
            label={activeTrainer.profile.name}
            description={tAthlete("trainer_connected_description")}
            onClick={() =>
              router.push(`/athlete/my-trainer/${activeTrainer.userId}`)
            }
          />
        ) : (
          <DashboardActionButton
            icon={<UserIcon className="h-4 w-4" />}
            label={tAthlete("find_trainer")}
            description={tAthlete("find_trainer_description")}
            onClick={() => router.push(ROUTES.ATHLETE_TRAINERS)}
          />
        )}
      </CardContent>
    </Card>
  );
}
