"use client";

import { Utensils } from "lucide-react";
import { useTranslations } from "next-intl"

interface MealItemProps {
  item: {
    food: string
    quantity: string
    calories?: number
    macros?: {
      protein?: number
      carbs?: number
      fats?: number
    }
  }
  index: number
}

export function MealItem({ item, index }: MealItemProps) {
  const t = useTranslations("meal")

  return (
    <div key={index} className='flex items-center text-sm justify-between'>
      <div className='flex items-center'>
        <Utensils className='mr-2 h-4 w-4 text-muted-foreground' />
        <span className='font-medium mr-2'>{item.food}</span>
        <span className='text-muted-foreground'>({item.quantity})</span>
      </div>
      <div className='text-muted-foreground text-xs'>
        {item.calories} {t("card.kcal")} | {t("item.protein_short")}{" "}
        {item.macros?.protein} {t("item.carbs_short")} {item.macros?.carbs}{" "}
        {t("item.fats_short")} {item.macros?.fats}
      </div>
    </div>
  )
}
