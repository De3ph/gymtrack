"use dom";

import { useEffect, useState } from "react";
import { domFetch, configureDomApi } from "./dom-api";
import { getDomT } from "./dom-i18n";
import "./globals.css";

interface DashboardDomProps {
  apiUrl?: string;
  token?: string | null;
  locale?: string;
  user?: { email?: string; role?: string };
}

interface WorkoutSummary { id: number; date: string; exerciseCount: number; }
interface MealSummary { id: number; date: string; mealType: string; itemCount: number; }

export default function DashboardDom({ apiUrl, token, locale = "en", user }: DashboardDomProps) {
  const [workouts, setWorkouts] = useState<WorkoutSummary[]>([]);
  const [meals, setMeals] = useState<MealSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const t = getDomT(locale);

  if (apiUrl || token) configureDomApi({ apiUrl, token });

  useEffect(() => {
    async function load() {
      try {
        const [wRes, mRes] = await Promise.all([
          domFetch<WorkoutSummary[]>("/workouts?limit=5"),
          domFetch<MealSummary[]>("/meals?limit=5"),
        ]);
        setWorkouts(wRes || []);
        setMeals(mRes || []);
      } catch {
        // silent — data will show empty state
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const quickActions = [
    { label: t("athlete.dashboard.log_workout"), href: "/workouts", color: "bg-blue-600" },
    { label: t("athlete.dashboard.log_meal"), href: "/meals", color: "bg-green-600" },
    { label: t("athlete.dashboard.progress"), href: "/measurements", color: "bg-purple-600" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {t("athlete.dashboard.title")}
          </h1>
          <p className="text-gray-500 text-sm">{user?.email}</p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading...</div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3">
              {quickActions.map((action) => (
                <a key={action.label} href={action.href}
                  className={`${action.color} text-white rounded-lg p-4 text-center text-sm font-medium hover:opacity-90 transition-opacity`}>
                  {action.label}
                </a>
              ))}
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4">
              <h2 className="font-semibold text-gray-900 mb-3">{t("athlete.dashboard.workouts")}</h2>
              {workouts.length === 0 ? (
                <p className="text-gray-400 text-sm">{t("athlete.workouts.no_workouts")}</p>
              ) : (
                <div className="space-y-2">
                  {workouts.map((w) => (
                    <div key={w.id} className="flex justify-between text-sm py-1 border-b border-gray-100 last:border-0">
                      <span className="text-gray-700">{w.date}</span>
                      <span className="text-gray-500">{w.exerciseCount} exercises</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4">
              <h2 className="font-semibold text-gray-900 mb-3">{t("athlete.dashboard.meals")}</h2>
              {meals.length === 0 ? (
                <p className="text-gray-400 text-sm">{t("athlete.meals.no_meals")}</p>
              ) : (
                <div className="space-y-2">
                  {meals.map((m) => (
                    <div key={m.id} className="flex justify-between text-sm py-1 border-b border-gray-100 last:border-0">
                      <span className="text-gray-700">{m.date}</span>
                      <span className="text-gray-500">{m.mealType} · {m.itemCount} items</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
