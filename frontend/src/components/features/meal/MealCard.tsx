"use client";

import dayjs from "dayjs";
import {
  Edit2,
  Trash2,
  MessageSquare,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Meal } from "@/types";
import { CommentThread } from "@/components/features/comments/CommentThread";
import { MealItem } from "./MealItem";
import { TARGET_TYPES } from "@/lib/constants";
import { staggerItem } from "@/lib/animations";

interface MealCardProps {
  meal: Meal;
  readOnly?: boolean;
  canEdit: (meal: Meal) => boolean;
  onEdit: (meal: Meal) => void;
  onDelete: (mealId: string) => void;
  expandedCommentsId: string | null;
  setExpandedCommentsId: (id: string | null) => void;
}

const calculateCalorie = (meal: Meal) => {
  return meal.items.reduce(
    (acc, item) => acc + (item.calories || 0),
    0,
  );
}

export function MealCard({
  meal,
  readOnly = false,
  canEdit,
  onEdit,
  onDelete,
  expandedCommentsId,
  setExpandedCommentsId,
}: MealCardProps) {
  const t = useTranslations("meal")

  return (
    <motion.div key={meal.mealId} variants={staggerItem} layout>
      <Card>
        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
          <div className='flex flex-col'>
            <CardTitle className='text-base font-semibold capitalize'>
              {meal.mealType} - {dayjs(meal.date).format("MMMM D, YYYY")}
            </CardTitle>
            <CardDescription>
              {meal.items.length} {t("card.items")} - {calculateCalorie(meal)}{" "}
              {t("card.kcal")}
            </CardDescription>
          </div>
          {!readOnly && (
            <div className='flex space-x-2'>
              {canEdit(meal) && (
                <>
                  <Button
                    variant='ghost'
                    size='icon'
                    onClick={() => onEdit(meal)}
                  >
                    <Edit2 className='h-4 w-4' />
                  </Button>
                  <Button
                    variant='ghost'
                    size='icon'
                    onClick={() => {
                      if (confirm(t("card.confirm_delete")))
                        onDelete(meal.mealId)
                    }}
                  >
                    <Trash2 className='h-4 w-4 text-destructive' />
                  </Button>
                </>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='space-y-2'>
            {meal.items.map((item, i) => (
              <MealItem key={i} item={item} index={i} />
            ))}
          </div>
          <div className='border-t pt-3'>
            <button
              type='button'
              className='w-full justify-start text-muted-foreground flex items-center hover:bg-accent/50 rounded-md px-2 py-2 transition-colors'
              onClick={() =>
                setExpandedCommentsId(
                  expandedCommentsId === meal.mealId ? null : meal.mealId
                )
              }
            >
              <MessageSquare className='mr-2 h-4 w-4' />
              {t("card.comments")}
              {expandedCommentsId === meal.mealId ? (
                <ChevronUp className='ml-auto h-4 w-4' />
              ) : (
                <ChevronDown className='ml-auto h-4 w-4' />
              )}
            </button>
            <AnimatePresence>
              {expandedCommentsId === meal.mealId && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className='mt-3 overflow-hidden'
                >
                  <CommentThread
                    targetType={TARGET_TYPES.MEAL}
                    targetId={meal.mealId}
                    readOnly={false}
                    enabled={true}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
