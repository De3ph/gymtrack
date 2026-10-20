"use client";

import * as React from "react";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import dayjs from "dayjs";
import { formatDate } from "@/lib/i18n/dayjs";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { Sortable, SortableItem } from "@/components/ui/sortable";
import { mealApi } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import { ApiErrorHandler } from "@/lib/error-handler";
import type { MealFormData, FoodItemFormData } from "@/lib/validations/meal";
import { createMealSchema } from "@/lib/validations/meal";
import { FoodItemCard } from "./FoodItemCard";
import { MealFormFields } from "./MealFormFields";

interface MealFormProps {
  onSuccess?: () => void;
  onClear?: () => void;
}

/**
 * Stable per-row id for a food item.
 *
 * The item array is reorderable, so the array index is not a stable identity —
 * after a drag the same index points at a different item. Each row carries a
 * `rowId` that survives reordering and is used as its React key and ref key.
 * It is not sent to the API: the mutation rebuilds every item from explicit
 * fields.
 */
let rowIdCounter = 0;
const nextRowId = () => `item-${rowIdCounter++}`;

type FormItem = FoodItemFormData & { rowId: string };
type MealFormValues = Omit<MealFormData, "items"> & { items: FormItem[] };

const createDefaultItem = (): FormItem => ({
  rowId: nextRowId(),
  food: "",
  quantity: "",
  calories: 0,
  macros: { protein: 0, carbs: 0, fats: 0 },
});

/**
 * Scrolls a newly added food item into view and focuses its food input.
 *
 * Rendered inside the `items` field render prop on purpose: `form.state` is a
 * plain getter, not a store subscription, so this reactive boundary is what
 * re-runs the effect whenever the array grows.
 */
function ItemAutoScroll({
  pendingRowId,
  cardRefs,
  onDone,
}: {
  /** Row to scroll to, or null when there's nothing pending. */
  pendingRowId: string | null;
  cardRefs: React.MutableRefObject<Map<string, HTMLElement>>;
  onDone: () => void;
}) {
  const onDoneRef = React.useRef(onDone);
  React.useEffect(() => {
    onDoneRef.current = onDone;
  });

  React.useEffect(() => {
    if (pendingRowId == null) return;

    let cancelled = false;
    let frame = 0;
    let attempts = 0;

    const run = () => {
      if (cancelled) return;

      const card = cardRefs.current.get(pendingRowId);
      if (!card) {
        // Ref not attached yet — retry on the next frame.
        if (attempts++ < 10) frame = requestAnimationFrame(run);
        else onDoneRef.current();
        return;
      }

      card.scrollIntoView({ behavior: "smooth", block: "center" });

      const input = card.querySelector<HTMLInputElement>(
        "input:not([type='hidden'])",
      );
      if (input) {
        input.focus({ preventScroll: true });
        onDoneRef.current();
        return;
      }
      if (attempts++ < 10) frame = requestAnimationFrame(run);
      else onDoneRef.current();
    };

    frame = requestAnimationFrame(run);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [pendingRowId, cardRefs]);

  return null;
}

export function MealForm({ onSuccess, onClear }: MealFormProps) {
  const queryClient = useQueryClient();
  const t = useTranslations("meal");
  const tValidation = useTranslations("meal.form.validation");
  const tCommon = useTranslations("common.actions");
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  /**
   * The values the form starts with.
   *
   * Built once: the form compares its defaults on every render and rewrites
   * its values when they changed, so a fresh `new Date()` (and a fresh set of
   * rows) on every render would clobber what the user typed.
   */
  const defaultValues = React.useMemo<MealFormValues>(
    () => ({
      date: new Date(),
      mealTime: formatDate(new Date(), "HH:mm"),
      mealType: "breakfast",
      items: [createDefaultItem()],
    }),
    [],
  );

  const mealSchema = React.useMemo(
    () => createMealSchema((key) => tValidation(key)),
    [tValidation],
  );

  const mealTypeItems = [
    { value: "breakfast" as const, label: t("form.meal_type.breakfast") },
    { value: "lunch" as const, label: t("form.meal_type.lunch") },
    { value: "dinner" as const, label: t("form.meal_type.dinner") },
    { value: "snack" as const, label: t("form.meal_type.snack") },
  ];

  const form = useForm({
    defaultValues,
    validators: {
      onSubmit: ({ value }) => {
        const result = mealSchema.safeParse(value);
        if (!result.success) {
          return result.error.issues
            .map((issue) => issue.message)
            .join(". ");
        }
        return undefined;
      },
    },
    onSubmit: async ({ value }) => {
      setSubmitError(null);
      createMeal(value);
    },
    onSubmitInvalid: ({ formApi }) => {
      const fieldMeta = formApi.state.fieldMeta;
      const errors = Object.values(fieldMeta ?? {})
        .flatMap((meta) => meta?.errors ?? [])
        .filter(Boolean);
      const messages = errors
        .map((e) => (typeof e === "string" ? e : e.message))
        .filter(Boolean);
      if (messages.length > 0) {
        setSubmitError(messages.join(". "));
      }
    },
  });

  const { mutate: createMeal, isPending } = useMutation({
    mutationFn: async (data: MealFormValues) => {
      const [hours, minutes] = data.mealTime.split(":").map(Number);
      const combinedDate = dayjs(data.date)
        .hour(hours)
        .minute(minutes)
        .second(0)
        .millisecond(0);

      return mealApi.create({
        date: combinedDate.toISOString(),
        mealType: data.mealType,
        items: data.items.map((item) => ({
          food: item.food,
          quantity: item.quantity,
          calories: item.calories || 0,
          macros: {
            protein: item.macros?.protein || 0,
            carbs: item.macros?.carbs || 0,
            fats: item.macros?.fats || 0,
          },
        })),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.meals.all });
      form.reset();
      setPendingScrollRowId(null);
      if (onSuccess) onSuccess();
    },
    onError: (error) => {
      const errorMessage = ApiErrorHandler.handle(error);
      setSubmitError(errorMessage);
      console.error("Failed to log meal:", errorMessage);
    },
  });

  /** Item card root elements, keyed by rowId — used to scroll to a new one. */
  const itemCardRefs = React.useRef<Map<string, HTMLElement>>(new Map());
  const itemRefCallbacks = React.useRef<
    Map<string, (node: HTMLElement | null) => void>
  >(new Map());
  /** Row id awaiting scroll+focus, set when "Add food item" is clicked. */
  const [pendingScrollRowId, setPendingScrollRowId] = React.useState<
    string | null
  >(null);

  // Cached per row so React doesn't detach/reattach refs on every render.
  const getItemCardRef = React.useCallback((rowId: string) => {
    let cb = itemRefCallbacks.current.get(rowId);
    if (!cb) {
      cb = (node: HTMLElement | null) => {
        if (node) itemCardRefs.current.set(rowId, node);
        else itemCardRefs.current.delete(rowId);
      };
      itemRefCallbacks.current.set(rowId, cb);
    }
    return cb;
  }, []);

  const addItem = () => {
    const item = createDefaultItem();
    setPendingScrollRowId(item.rowId);
    form.setFieldValue("items", (prev) => [...prev, item]);
  };

  const removeItem = React.useCallback(
    (rowId: string) => {
      form.setFieldValue("items", (prev) =>
        prev.filter((item) => item.rowId !== rowId),
      );
      itemCardRefs.current.delete(rowId);
      itemRefCallbacks.current.delete(rowId);
    },
    [form],
  );

  const handleReorder = React.useCallback(
    (next: FormItem[]) => {
      form.setFieldValue("items", next);
    },
    [form],
  );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setSubmitError(null);
        form.handleSubmit();
      }}
      className="space-y-6"
    >
      {submitError && (
        <div
          role="alert"
          className="border border-destructive/20 bg-destructive/10 p-3 font-mono text-xs leading-4 text-destructive rounded-none"
        >
          {submitError}
        </div>
      )}

      <MealFormFields form={form} t={t} mealTypeItems={mealTypeItems} />

      <Separator />

      <form.Field name="items" mode="array">
        {(field) => {
          const items = field.state.value;
          return (
            <div className="space-y-6">
              <ItemAutoScroll
                pendingRowId={pendingScrollRowId}
                cardRefs={itemCardRefs}
                onDone={() => setPendingScrollRowId(null)}
              />
              <Sortable
                value={items}
                onValueChange={handleReorder}
                getItemValue={(item) => item.rowId}
              >
                {items.map((item, index) => (
                  <SortableItem
                    key={item.rowId}
                    value={item.rowId}
                    className="bg-background"
                  >
                    <FoodItemCard
                      form={form}
                      index={index}
                      onRemove={() => removeItem(item.rowId)}
                      canRemove={items.length > 1}
                      t={t}
                      testIdPrefix="meal"
                      containerRef={getItemCardRef(item.rowId)}
                    />
                  </SortableItem>
                ))}
              </Sortable>
              <Button
                type="button"
                variant="outline"
                onClick={addItem}
                className="w-full rounded-none border-border font-mono text-xs uppercase tracking-[0.18em]"
              >
                <Plus className="size-5" aria-hidden="true" /> {t("form.add_food_item")}
              </Button>
            </div>
          );
        }}
      </form.Field>

      <Separator />

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            form.reset();
            setPendingScrollRowId(null);
            onClear?.();
          }}
          className="w-full rounded-none font-mono text-xs uppercase tracking-[0.18em] sm:w-auto"
        >
          {tCommon("clear")}
        </Button>
        <Button
          type="submit"
          disabled={isPending}
          className="w-full rounded-none font-mono text-xs uppercase tracking-[0.18em] sm:w-auto sm:ml-auto"
        >
          {isPending && <Spinner className="mr-2" />}
          {t("form.log_meal")}
        </Button>
      </div>
    </form>
  );
}
