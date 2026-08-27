"use client";

import { memo } from "react";
import { formatDate } from "@/lib/i18n/dayjs";
import {
  Edit2,
  Trash2,
  MessageSquare,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
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
  () => import("@/components/features/comments/CommentThread").then(m => m.CommentThread),
  { ssr: false, loading: () => <Skeleton className="h-12 w-full rounded-none" /> }
);

interface MealCardProps {
  meal: Meal;
  readOnly?: boolean;
  canEdit: (meal: Meal) => boolean;
  onEdit: (meal: Meal) => void;
  onDelete: (mealId: string | number) => void;
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
  readOnly = false,
  canEdit,
  onEdit,
  onDelete,
  expandedCommentsId,
  setExpandedCommentsId,
}: MealCardProps) {
  const t = useTranslations("meal")
  const expanded = expandedCommentsId === meal.mealId;

  return (
    <motion.div key={meal.mealId} variants={staggerItem} layout>
      <div className="border border-border">
        <header className="flex items-center justify-between border-b border-border px-6 py-4 sm:px-8">
          <div className="min-w-0">
            <h3 className="font-mono text-xs uppercase tracking-[0.18em] text-foreground capitalize">
              {meal.mealType}
            </h3>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              {formatDate(meal.date, "MMMM D, YYYY")} · {meal.items.length} {t("card.items")} · {calculateCalorie(meal)} {t("card.kcal")}
            </p>
          </div>
          {!readOnly && canEdit(meal) && (
            <div className="flex shrink-0 items-center gap-1">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => onEdit(meal)}
                aria-label={t("list.edit")}
                className="rounded-none"
              >
                <Edit2 className="size-4" aria-hidden="true" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => {
                  if (confirm(t("card.confirm_delete")))
                    onDelete(meal.mealId)
                }}
                aria-label={t("list.delete")}
                className="rounded-none text-destructive hover:text-destructive"
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </Button>
            </div>
          )}
        </header>

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

        <Button
          type="button"
          variant="ghost"
          onClick={() =>
            setExpandedCommentsId(expanded ? null : meal.mealId)
          }
          className="flex w-full items-center justify-start gap-2 rounded-none px-6 py-3 font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground sm:px-8"
          aria-expanded={expanded}
        >
          <MessageSquare className="size-3.5" aria-hidden="true" />
          {t("card.comments")}
          {expanded ? (
            <ChevronUp className="ml-auto size-4" aria-hidden="true" />
          ) : (
            <ChevronDown className="ml-auto size-4" aria-hidden="true" />
          )}
        </Button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden border-t border-border"
            >
              <div className="px-6 py-4 sm:px-8">
                <CommentThread
                  targetType={TARGET_TYPES.MEAL}
                  targetId={meal.mealId}
                  readOnly={false}
                  enabled={true}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
})
