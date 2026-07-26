"use dom";

import { useEffect, useState } from "react";
import { domFetch, configureDomApi } from "./dom-api";
import { getDomT } from "./dom-i18n";
import "./globals.css";

interface MealsDomProps {
  apiUrl?: string;
  token?: string | null;
  locale?: string;
}

interface Meal { id: number; date: string; mealType: string; items: { name: string; calories?: number }[]; }

export default function MealsDom({ apiUrl, token, locale = "en" }: MealsDomProps) {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const t = getDomT(locale);

  if (apiUrl || token) configureDomApi({ apiUrl, token });

  useEffect(() => {
    domFetch<Meal[]>("/meals?limit=20")
      .then((data) => setMeals(data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalCalories = meals.reduce((sum, m) =>
    sum + m.items.reduce((s, i) => s + (i.calories || 0), 0), 0
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto px-4 py-6">
        <h1 className="text-xl font-bold text-gray-900 mb-5">{t("athlete.meals.title")}</h1>

        {!loading && (
          <div className="bg-white rounded-lg shadow-sm p-4 mb-5">
            <div className="flex justify-between items-center">
              <span className="text-gray-500 text-sm">Today total</span>
              <span className="font-bold text-gray-900">{totalCalories} cal</span>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading...</div>
        ) : meals.length === 0 ? (
          <div className="text-center py-12 text-gray-400">{t("athlete.meals.no_meals")}</div>
        ) : (
          <div className="space-y-3">
            {meals.map((m) => (
              <div key={m.id} className="bg-white rounded-lg shadow-sm p-4">
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <span className="font-medium text-gray-900 text-sm">{m.mealType}</span>
                    <span className="text-gray-400 text-xs ml-2">{m.date}</span>
                  </div>
                  <span className="text-gray-500 text-xs">{m.items.length} items</span>
                </div>
                <div className="space-y-1">
                  {m.items.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm text-gray-600">
                      <span>{item.name}</span>
                      {item.calories && <span className="text-gray-400">{item.calories} cal</span>}
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
