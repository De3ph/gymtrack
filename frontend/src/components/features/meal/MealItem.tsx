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

  const macroParts = [
    `${t("item.protein_short")} ${item.macros?.protein ?? 0}`,
    `${t("item.carbs_short")} ${item.macros?.carbs ?? 0}`,
    `${t("item.fats_short")} ${item.macros?.fats ?? 0}`,
  ].join(" · ");

  return (
    <Item
      variant="outline"
      size="sm"
      className="rounded-none border-0 border-b border-border px-0 py-2.5 last:border-b-0"
    >
      <ItemMedia variant="icon" className="rounded-none">
        <Utensils className="size-4 text-muted-foreground" aria-hidden="true" />
      </ItemMedia>
      <ItemContent>
        <ItemTitle className="text-sm font-medium text-foreground">
          {item.food}
          <span className="font-normal text-muted-foreground">
            {" "}
            ({item.quantity})
          </span>
        </ItemTitle>
      </ItemContent>
      <ItemActions>
        <span className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
          {item.calories ?? 0} {t("card.kcal")} · {macroParts}
        </span>
      </ItemActions>
    </Item>
  );
}
