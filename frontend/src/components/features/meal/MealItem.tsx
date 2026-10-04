"use client";

import { Utensils } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  Item,
  ItemActions,
  ItemContent,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";

interface MealItemProps {
  item: {
    food: string;
    quantity: string;
    calories?: number;
    macros?: {
      protein?: number;
      carbs?: number;
      fats?: number;
    };
  };
  index: number;
}

export function MealItem({ item }: MealItemProps) {
  const t = useTranslations("meal");

  const badgeClass =
    "flex items-baseline gap-1.5 border border-border px-2.5 py-1 font-mono text-xs tabular-nums text-foreground";

  return (
    <Item
      variant="outline"
      size="sm"
      className="rounded-none border-0 border-b border-border px-0 py-2.5 last:border-b-0"
    >
      <ItemMedia variant="icon" className="rounded-none">
        <Utensils className="size-5 text-muted-foreground" aria-hidden="true" />
      </ItemMedia>
      <ItemContent>
        <ItemTitle className="text-sm font-semibold text-foreground">
          {item.food}
          <span className="font-medium text-muted-foreground">
            {" "}
            ({item.quantity})
          </span>
        </ItemTitle>
      </ItemContent>
      <ItemActions>
        <ul className="flex flex-wrap items-baseline justify-end gap-2">
          <li className={badgeClass}>
            {item.calories ?? 0}
            <span className="text-[10px] text-muted-foreground">
              {t("card.kcal")}
            </span>
          </li>
          <li className={badgeClass}>
            <span>{t("form.macros.protein")}</span>
            {item.macros?.protein ?? 0}
            <span className="text-[10px] text-muted-foreground">g</span>
          </li>
          <li className={badgeClass}>
            <span>{t("form.macros.carbs")}</span>
            {item.macros?.carbs ?? 0}
            <span className="text-[10px] text-muted-foreground">g</span>
          </li>
          <li className={badgeClass}>
            <span>{t("form.macros.fats")}</span>
            {item.macros?.fats ?? 0}
            <span className="text-[10px] text-muted-foreground">g</span>
          </li>
        </ul>
      </ItemActions>
    </Item>
  );
}
