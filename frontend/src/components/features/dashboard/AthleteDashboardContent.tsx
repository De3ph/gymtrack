"use client";

import { CombinedTrainingCalendar } from "@/components/features/dashboard/CombinedTrainingCalendar";
import { DashboardActionButton } from "@/components/features/dashboard/DashboardActionButton";
import { DashboardMetric, DashboardShell } from "@/components/features/dashboard/DashboardShell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { mealApi, relationshipApi, workoutApi } from "@/lib/api";
import { ROUTES } from "@/lib/routes";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { CalendarDays, Dumbbell, User, UtensilsCrossed } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { staggerContainer } from "@/lib/animations";

function getWeekRange() {
  const start = dayjs().startOf("week");
  const end = dayjs().endOf("week");

  return {
    startDate: start.format("YYYY-MM-DD"),
    endDate: end.format("YYYY-MM-DD"),
  };
}

export function AthleteDashboardContent() {
  const router = useRouter();
  const t = useTranslations("dashboard");
  const tAthlete = useTranslations("athlete.dashboard");
  const weekRange = getWeekRange();

  const { data: workoutData } = useQuery({
    queryKey: ["dashboard-athlete-workouts", weekRange.startDate, weekRange.endDate],
    queryFn: () => workoutApi.getAll(weekRange),
  });

  const { data: mealData } = useQuery({
    queryKey: ["dashboard-athlete-meals", weekRange.startDate, weekRange.endDate],
    queryFn: () => mealApi.getAll(weekRange),
  });

  const { data: trainerData } = useQuery({
    queryKey: ["dashboard-my-trainer"],
    queryFn: relationshipApi.getMyTrainer,
  });

  const workoutsThisWeek = workoutData?.workouts.length ?? 0;
  const mealsThisWeek = mealData?.meals.length ?? 0;
  const activeTrainer = trainerData?.activeTrainer?.trainer;

  return (
    <DashboardShell
      eyebrow={tAthlete("eyebrow")}
      title={tAthlete("title")}
      description={tAthlete("description")}
    >
      <motion.section className="grid gap-4 md:grid-cols-3" variants={staggerContainer} initial="hidden" animate="visible">
        <DashboardMetric label={t("stats.workouts")} value={workoutsThisWeek} hint={tAthlete("workout_hint")} />
        <DashboardMetric label={t("stats.meals")} value={mealsThisWeek} hint={tAthlete("meal_hint")} />
        <DashboardMetric
          label={tAthlete("trainer")}
          value={activeTrainer ? activeTrainer.profile.name : "—"}
          hint={activeTrainer ? tAthlete("trainer_connected") : tAthlete("trainer_empty")}
        />
      </motion.section>

      <motion.section className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]" variants={staggerContainer} initial="hidden" animate="visible">
        <CombinedTrainingCalendar startDate={weekRange.startDate} endDate={weekRange.endDate} />
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
                icon={<User className="h-4 w-4" />}
                label={activeTrainer.profile.name}
                description={tAthlete("trainer_connected_description")}
                onClick={() => router.push(`/athlete/my-trainer/${activeTrainer.userId}`)}
              />
            ) : (
              <DashboardActionButton
                icon={<User className="h-4 w-4" />}
                label={tAthlete("find_trainer")}
                description={tAthlete("find_trainer_description")}
                onClick={() => router.push(ROUTES.ATHLETE_TRAINERS)}
              />
            )}
          </CardContent>
        </Card>
      </motion.section>
    </DashboardShell>
  );
}
