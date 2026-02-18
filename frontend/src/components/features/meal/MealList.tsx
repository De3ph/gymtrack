"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Edit2, Trash2, Utensils, MessageSquare, ChevronDown, ChevronUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { mealApi } from "@/lib/api";
import { Meal } from "@/types";
import { EditMealDialog } from "./EditMealDialog";
import { CommentThread } from "@/components/features/comments/CommentThread";

interface MealListProps {
  meals?: Meal[];
  readOnly?: boolean;
}

export function MealList({ meals: propMeals, readOnly = false }: MealListProps) {
  const queryClient = useQueryClient();
  const [editingMeal, setEditingMeal] = React.useState<Meal | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [expandedCommentsId, setExpandedCommentsId] = React.useState<string | null>(null);

  // Only fetch data if not provided as props
  const { data, isLoading } = useQuery({
    queryKey: ["meals"],
    queryFn: () => mealApi.getAll(),
    enabled: !propMeals, // Don't fetch if meals are provided as props
  });

  const { mutate: deleteMeal } = useMutation({
    mutationFn: (id: string) => mealApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meals"] });
    },
  });

  const canEdit = (meal: Meal) => {
    const createdAt = new Date(meal.createdAt);
    const now = new Date();
    return now.getTime() - createdAt.getTime() < 24 * 60 * 60 * 1000;
  };

  const handleEditClick = (meal: Meal) => {
    setEditingMeal(meal);
    setIsEditDialogOpen(true);
  };

  if (isLoading && !propMeals) {
    return <div>Loading meals...</div>;
  }

  const meals = propMeals || data?.meals || [];

  if (meals.length === 0) {
    return (
      <div className="text-center p-8 text-muted-foreground">
        No meals logged yet. Start tracking your nutrition!
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {meals.map((meal) => (
        <Card key={meal.mealId}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex flex-col">
              <CardTitle className="text-base font-semibold capitalize">
                {meal.mealType} - {format(new Date(meal.date), "PPP")}
              </CardTitle>
              <CardDescription>
                {meal.items.length} Items -{" "}
                {meal.items.reduce(
                  (acc, item) => acc + (item.calories || 0),
                  0,
                )}{" "}
                kcal
              </CardDescription>
            </div>
            {!readOnly && (
              <div className="flex space-x-2">
                {canEdit(meal) && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditClick(meal)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm("Are you sure?")) deleteMeal(meal.mealId);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </>
                )}
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {meal.items.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center text-sm justify-between"
                >
                  <div className="flex items-center">
                    <Utensils className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span className="font-medium mr-2">{item.food}</span>
                    <span className="text-muted-foreground">
                      ({item.quantity})
                    </span>
                  </div>
                  <div className="text-muted-foreground text-xs">
                    {item.calories} kcal | P: {item.macros?.protein}C:{" "}
                    {item.macros?.carbs}F: {item.macros?.fats}
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t pt-3">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-muted-foreground"
                onClick={() =>
                  setExpandedCommentsId((id) =>
                    id === meal.mealId ? null : meal.mealId
                  )
                }
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                Comments
                {expandedCommentsId === meal.mealId ? (
                  <ChevronUp className="ml-auto h-4 w-4" />
                ) : (
                  <ChevronDown className="ml-auto h-4 w-4" />
                )}
              </Button>
              {expandedCommentsId === meal.mealId && (
                <div className="mt-3">
                  <CommentThread
                    targetType="meal"
                    targetId={meal.mealId}
                    readOnly={false}
                    enabled={true}
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}

      {!readOnly && (
        <EditMealDialog
          meal={editingMeal}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
        />
      )}
    </div>
  );
}
