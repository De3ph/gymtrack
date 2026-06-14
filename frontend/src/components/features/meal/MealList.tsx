"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { motion, AnimatePresence } from "motion/react";
import { useTranslations } from "next-intl"

import { mealApi } from "@/lib/api"
import { Meal } from "@/types"
import { EditMealDialog } from "./EditMealDialog"
import { MealCard } from "./MealCard"
import { TIME_LIMITS } from "@/lib/constants"
import { staggerContainer } from "@/lib/animations"

interface MealListProps {
  meals?: Meal[]
  readOnly?: boolean
}

export function MealList({
  meals: propMeals,
  readOnly = false
}: MealListProps) {
  const t = useTranslations("meal")
  const queryClient = useQueryClient()
  const [editingMeal, setEditingMeal] = React.useState<Meal | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false)
  const [expandedCommentsId, setExpandedCommentsId] = React.useState<
    string | null
  >(null)

  // Only fetch data if not provided as props
  const { data, isLoading } = useQuery({
    queryKey: ["meals"],
    queryFn: () => mealApi.getAll(),
    enabled: !propMeals // Don't fetch if meals are provided as props
  })

  const { mutate: deleteMeal } = useMutation({
    mutationFn: (id: string) => mealApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meals"] })
    }
  })

  const canEdit = (meal: Meal) => {
    const createdAt = dayjs(meal.createdAt)
    const now = dayjs()
    return now.diff(createdAt, "hour") < TIME_LIMITS.EDIT_WINDOW_HOURS
  }

  const handleEditClick = (meal: Meal) => {
    setEditingMeal(meal)
    setIsEditDialogOpen(true)
  }

  if (isLoading && !propMeals) {
    return <div>{t("list.loading")}</div>
  }

  const meals = propMeals || data?.meals || []

  if (meals.length === 0) {
    return (
      <div className='text-center p-8 text-muted-foreground'>
        {t("list.no_meals")}
      </div>
    )
  }

  return (
    <motion.div
      className='space-y-4'
      variants={staggerContainer}
      initial='hidden'
      animate='visible'
    >
      <AnimatePresence mode='popLayout'>
        {meals.map((meal) => (
          <MealCard
            key={meal.mealId}
            meal={meal}
            readOnly={readOnly}
            canEdit={canEdit}
            onEdit={handleEditClick}
            onDelete={deleteMeal}
            expandedCommentsId={expandedCommentsId}
            setExpandedCommentsId={setExpandedCommentsId}
          />
        ))}
      </AnimatePresence>

      {!readOnly && (
        <EditMealDialog
          meal={editingMeal}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
        />
      )}
    </motion.div>
  )
}
