"use dom";

import { useEffect, useState } from "react";
import { domFetch, configureDomApi } from "./dom-api";
import { getDomT } from "./dom-i18n";
import "./globals.css";

interface WorkoutsDomProps {
  apiUrl?: string;
  token?: string | null;
  locale?: string;
}

interface Workout { id: number; date: string; exercises: { name: string; sets: { reps: number; weight?: number }[] }[]; }

export default function WorkoutsDom({ apiUrl, token, locale = "en" }: WorkoutsDomProps) {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "form">("list");
  const t = getDomT(locale);

  if (apiUrl || token) configureDomApi({ apiUrl, token });

  useEffect(() => {
    domFetch<Workout[]>("/workouts?limit=20")
      .then((data) => setWorkouts(data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-5">
          <h1 className="text-xl font-bold text-gray-900">{t("athlete.workouts.title")}</h1>
          <button onClick={() => setView(view === "list" ? "form" : "list")}
            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium">
            {view === "list" ? t("athlete.workouts.log_workout") : t("athlete.workouts.view_history")}
          </button>
        </div>

        {view === "form" && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-5">
            <h2 className="font-semibold text-gray-900 mb-4">{t("athlete.workouts.card_title")}</h2>
            <p className="text-gray-400 text-sm">{t("athlete.workouts.card_description")}</p>
            <div className="mt-4 p-4 bg-gray-50 rounded-md text-center text-gray-500 text-sm">
              Workout form — nativize in Step 4 with native exercise set inputs
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading...</div>
        ) : workouts.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            {t("athlete.workouts.no_workouts")}
          </div>
        ) : (
          <div className="space-y-3">
            {workouts.map((w) => (
              <div key={w.id} className="bg-white rounded-lg shadow-sm p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-gray-900 text-sm">{w.date}</span>
                  <span className="text-gray-400 text-xs">{w.exercises.length} exercises</span>
                </div>
                <div className="space-y-1">
                  {w.exercises.map((ex, i) => (
                    <div key={i} className="flex justify-between text-sm text-gray-600">
                      <span>{ex.name}</span>
                      <span>{ex.sets.length} sets</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
