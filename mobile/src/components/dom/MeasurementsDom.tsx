"use dom";

import { useEffect, useState } from "react";
import { domFetch, configureDomApi } from "./dom-api";
import { getDomT } from "./dom-i18n";
import "./globals.css";

interface MeasurementsDomProps {
  apiUrl?: string;
  token?: string | null;
  locale?: string;
}

interface Measurement { id: number; date: string; weight?: number; bodyFatPct?: number; parts?: Record<string, number>; }

export default function MeasurementsDom({ apiUrl, token, locale = "en" }: MeasurementsDomProps) {
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [loading, setLoading] = useState(true);
  const t = getDomT(locale);

  if (apiUrl || token) configureDomApi({ apiUrl, token });

  useEffect(() => {
    domFetch<Measurement[]>("/measurements?limit=20")
      .then((data) => setMeasurements(data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto px-4 py-6">
        <h1 className="text-xl font-bold text-gray-900 mb-5">{t("athlete.measurements.title")}</h1>

        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading...</div>
        ) : measurements.length === 0 ? (
          <div className="text-center py-12 text-gray-400">No measurements recorded</div>
        ) : (
          <div className="space-y-3">
            {measurements.map((m) => (
              <div key={m.id} className="bg-white rounded-lg shadow-sm p-4">
                <div className="text-sm font-medium text-gray-900 mb-2">{m.date}</div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  {m.weight && (
                    <div className="bg-gray-50 rounded p-2 text-center">
                      <div className="text-gray-400 text-xs">Weight</div>
                      <div className="font-medium text-gray-900">{m.weight} kg</div>
                    </div>
                  )}
                  {m.bodyFatPct && (
                    <div className="bg-gray-50 rounded p-2 text-center">
                      <div className="text-gray-400 text-xs">Body Fat</div>
                      <div className="font-medium text-gray-900">{m.bodyFatPct}%</div>
                    </div>
                  )}
                  {m.parts && Object.keys(m.parts).length > 0 && (
                    <div className="bg-gray-50 rounded p-2 text-center">
                      <div className="text-gray-400 text-xs">Parts</div>
                      <div className="font-medium text-gray-900">{Object.keys(m.parts).length}</div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
