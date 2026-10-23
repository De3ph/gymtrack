"use client";

import { memo } from "react";
import { formatDate } from "@/lib/i18n/dayjs";
import {
  MessageSquare,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  AnimatePresence,
  type Transition,
  useReducedMotion,
} from "motion/react";
import * as m from "motion/react-m";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Meal } from "@/types";
import { MealItem } from "./MealItem";
import { TARGET_TYPES } from "@/lib/constants";
import { staggerItem } from "@/lib/animations";

const CommentThread = dynamic(
  () => import("@/components/features/comments/CommentThread").then((mod) => mod.CommentThread),
  { ssr: false, loading: () => <Skeleton className="h-12 w-full rounded-none" /> }
);

interface MealCardProps {
  meal: Meal;
  isCollapsed: boolean;
  onToggle: () => void;
  expandedCommentsId: string | number | null;
  setExpandedCommentsId: (id: string | number | null) => void;
}

const calculateCalorie = (meal: Meal) => {
  return meal.items.reduce(
    (acc, item) => acc + (item.calories || 0),
    0,
  );
}

export const MealCard = memo(function MealCardImpl({
  meal,
  isCollapsed,
  onToggle,
  expandedCommentsId,
  setExpandedCommentsId,
}: MealCardProps) {
  const t = useTranslations("meal")
  const expanded = expandedCommentsId === meal.mealId;
  const reduce = useReducedMotion();
  const collapseTransition: Transition = reduce
    ? { duration: 0 }
    : { duration: 0.2, ease: [0.23, 1, 0.32, 1] };

  return (
    // `layout` needs the layout feature, which is not part of domAnimation.
    // The provider lives in MealList so a list of cards mounts one, not one
    // per card.
    <m.div key={meal.mealId} variants={staggerItem} layout>
    <article className="border border-border">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={!isCollapsed}
        aria-controls={`meal-card-body-${meal.mealId}`}
        aria-label={isCollapsed ? "Expand meal" : "Collapse meal"}
        className="flex w-full flex-row items-center justify-between gap-3 rounded-none px-6 py-4 text-left transition-colors outline-none hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 sm:px-8"
      >
        <div className="min-w-0">
          <h3 className="font-mono text-xs uppercase tracking-[0.18em] text-foreground capitalize">
            {meal.mealType}
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              {formatDate(meal.date, "MMMM D, YYYY")} · {meal.items.length} {t("card.items")}
            </p>
            <span className="flex items-baseline gap-1.5 border border-border px-2.5 py-1 font-mono text-xs tabular-nums text-foreground">
              {calculateCalorie(meal)}
              <span className="text-[10px] text-muted-foreground">
                {t("card.kcal")}
              </span>
            </span>
          </div>
        </div>
        <m.span
          className="flex shrink-0 text-muted-foreground"
          animate={{ rotate: isCollapsed ? 0 : 180 }}
          transition={collapseTransition}
        >
          <ChevronDown className="size-4" aria-hidden="true" />
        </m.span>
      </button>

      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <m.div
            key="body"
            id={`meal-card-body-${meal.mealId}`}
            className="overflow-hidden border-t border-border"
            initial={reduce ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduce ? undefined : { height: 0, opacity: 0 }}
            transition={collapseTransition}
          >
            <div className="px-6 sm:px-8">
              <ul className="divide-y divide-border">
                {meal.items.map((item, i) => (
                  <li key={i} className="list-none">
                    <MealItem item={item} index={i} />
                  </li>
                ))}
              </ul>
            </div>

            <Separator />

            <div>
              <Button
                type="button"
                variant="ghost"
                onClick={() =>
                  setExpandedCommentsId(expanded ? null : (meal.mealId ?? null))
                }
                className="flex w-full items-center justify-start gap-2 rounded-none px-6 py-3 font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground sm:px-8"
                aria-expanded={expanded}
              >
                <MessageSquare className="size-5" aria-hidden="true" />
                {t("card.comments")}
                {expanded ? (
                  <ChevronUp className="ml-auto size-5" aria-hidden="true" />
                ) : (
                  <ChevronDown className="ml-auto size-5" aria-hidden="true" />
                )}
              </Button>

              <AnimatePresence>
                {expanded && (
                  <m.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={reduce ? { duration: 0 } : { duration: 0.3 }}
                    className="overflow-hidden border-t border-border"
                  >
                    <div className="px-6 py-4 sm:px-8">
                      <CommentThread
                        targetType={TARGET_TYPES.MEAL}
                        targetId={meal.mealId ?? ""}
                        readOnly={false}
                        enabled={true}
                      />
                    </div>
                  </m.div>
                  )}
                </AnimatePresence>
              </div>
            </m.div>
          )}
        </AnimatePresence>
      </article>
    </m.div>
  )
})
