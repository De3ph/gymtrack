"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { WorkoutForm } from "@/components/features/workout/WorkoutForm";
import { WorkoutList } from "@/components/features/workout/WorkoutList";
import { WorkoutCalendar } from "@/components/features/workout/WorkoutCalendar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { useTranslations } from "next-intl";
import { Workout, WorkoutExercise, WorkoutPlan } from "@/types";
import { workoutPlanApi } from "@/lib/api";

function buildWorkoutFromPlan(plan: WorkoutPlan): Workout {
  const exercises: WorkoutExercise[] = plan.exercises.map((pe) => ({
    exerciseId: pe.exerciseId,
    name: pe.name,
    notes: pe.notes,
    sets: pe.sets.map((ps) => ({
      setId: ps.setId || "",
      weight: ps.weight,
      weightUnit: ps.weightUnit,
      reps: ps.reps,
      restTime: ps.restTime,
      completed: false,
    })),
  }));

  return {
    workoutId: "",
    athleteId: "",
    date: new Date().toISOString(),
    exercises,
    planId: plan.planId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export default function WorkoutsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const planId = searchParams.get("planId");
  const [activeTab, setActiveTab] = useState(planId ? "log" : "log");
  const t = useTranslations("athlete.workouts");

  const { data: plan } = useQuery<WorkoutPlan>({
    queryKey: ["workout-plan", planId],
    queryFn: () => workoutPlanApi.getById(planId!),
    enabled: !!planId,
  });

  const initialWorkout = plan ? buildWorkoutFromPlan(plan) : undefined;

  const handleClear = () => {
    if (planId) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("planId");
      router.push(`${pathname}?${params.toString()}`);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>

      <Tabs
        defaultValue="log"
        className="w-full"
        onValueChange={setActiveTab}
        value={activeTab}
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="log">{t("log_tab")}</TabsTrigger>
          <TabsTrigger value="list">{t("list_tab")}</TabsTrigger>
          <TabsTrigger value="calendar">{t("calendar_tab")}</TabsTrigger>
        </TabsList>

        <TabsContent value="log">
          <div className="max-w-2xl">
            <Card>
              <CardHeader>
                <CardTitle>{t("card_title")}</CardTitle>
                <CardDescription>
                  {t("card_description")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <WorkoutForm
                  key={planId || "default"}
                  workout={initialWorkout}
                  onSuccess={() => setActiveTab("list")}
                  onClear={handleClear}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="list">
          <WorkoutList />
        </TabsContent>

        <TabsContent value="calendar">
          <WorkoutCalendar />
        </TabsContent>
      </Tabs>
    </div>
  );
}
