"use dom";

import { configureDomApi } from "./dom-api";
import { getDomT } from "./dom-i18n";
import "./globals.css";

interface SkeletonProps { apiUrl?: string; token?: string | null; locale?: string; }

function DomShell({ title, subtitle, locale = "en" }: { title: string; subtitle: string; locale?: string }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-xl font-bold text-gray-900 mb-2">{title}</h1>
        <p className="text-gray-400 text-sm">{subtitle}</p>
      </div>
    </div>
  );
}

export function ClientsDom({ apiUrl, token, locale }: SkeletonProps) {
  if (apiUrl || token) configureDomApi({ apiUrl, token });
  const t = getDomT(locale);
  return <DomShell title={t("trainer.clients.title") || "My Clients"} subtitle="DOM shell — nativize in Step 4" locale={locale} />;
}

export function ClientDetailDom({ apiUrl, token, locale }: SkeletonProps) {
  if (apiUrl || token) configureDomApi({ apiUrl, token });
  return <DomShell title="Client Detail" subtitle="DOM shell — nativize in Step 4" locale={locale} />;
}

export function WorkoutPlansDom({ apiUrl, token, locale }: SkeletonProps) {
  if (apiUrl || token) configureDomApi({ apiUrl, token });
  return <DomShell title="Workout Plans" subtitle="DOM shell — nativize in Step 4" locale={locale} />;
}

export function WorkoutPlanDetailDom({ apiUrl, token, locale }: SkeletonProps) {
  if (apiUrl || token) configureDomApi({ apiUrl, token });
  return <DomShell title="Plan Detail" subtitle="DOM shell — nativize in Step 4" locale={locale} />;
}

export function CoachingRequestsDom({ apiUrl, token, locale }: SkeletonProps) {
  if (apiUrl || token) configureDomApi({ apiUrl, token });
  return <DomShell title="Coaching Requests" subtitle="DOM shell — nativize in Step 4" locale={locale} />;
}

export function TrainerProfileDom({ apiUrl, token, locale }: SkeletonProps) {
  if (apiUrl || token) configureDomApi({ apiUrl, token });
  return <DomShell title="Trainer Profile" subtitle="DOM shell — nativize in Step 4" locale={locale} />;
}

export function TrainerCatalogDom({ apiUrl, token, locale }: SkeletonProps) {
  if (apiUrl || token) configureDomApi({ apiUrl, token });
  return <DomShell title="Find Trainers" subtitle="DOM shell — nativize in Step 4" locale={locale} />;
}

export function TrainerDetailDom({ apiUrl, token, locale }: SkeletonProps) {
  if (apiUrl || token) configureDomApi({ apiUrl, token });
  return <DomShell title="Trainer Detail" subtitle="DOM shell — nativize in Step 4" locale={locale} />;
}

export function MyTrainerDom({ apiUrl, token, locale }: SkeletonProps) {
  if (apiUrl || token) configureDomApi({ apiUrl, token });
  return <DomShell title="My Trainer" subtitle="DOM shell — nativize in Step 4" locale={locale} />;
}

export function MyWorkoutPlansDom({ apiUrl, token, locale }: SkeletonProps) {
  if (apiUrl || token) configureDomApi({ apiUrl, token });
  return <DomShell title="My Workout Plans" subtitle="DOM shell — nativize in Step 4" locale={locale} />;
}
