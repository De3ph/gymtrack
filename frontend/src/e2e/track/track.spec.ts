import { test, expect, type Page } from "@playwright/test";
import {
  setupAthleteState,
  mockExerciseCatalogApi,
  mockWorkoutsApi,
  mockMealsApi,
  mockMeasurementsApi,
  mockCommentsApi,
} from "../helpers/mock-athlete";

const nowIso = new Date().toISOString();

/**
 * Pick a date using the DatePicker component:
 * 1. Click the trigger by testid to open the popover
 * 2. Set month/year via the dropdowns (aria-labels "Month:" / "Year:")
 * 3. Click the target day button inside the popover content
 */
async function pickDate(
  page: Page,
  testId: string,
  { year, month, day }: { year: number; month: number; day: number },
) {
  await page.getByTestId(testId).click();

  const popover = page.locator('[data-slot="popover-content"]');
  await popover.waitFor({ state: 'visible' });

  const monthSelect = popover.locator('select').first();
  const yearSelect = popover.locator('select').last();

  await yearSelect.selectOption(String(year));
  await monthSelect.selectOption(String(month - 1));

  const dayButton = popover.locator(`button`).filter({ hasText: new RegExp(`^${day}$`) }).first();
  await dayButton.click();
}

const recentWorkout = {
  workoutId: 1,
  athleteId: 1,
  date: nowIso,
  createdAt: nowIso,
  updatedAt: nowIso,
  exercises: [
    {
      exerciseId: 1,
      name: "Bench Press",
      sets: [
        {
          setId: 1,
          weight: 50,
          weightUnit: "kg",
          reps: 10,
          restTime: 60,
          completed: false,
        },
      ],
    },
  ],
};

const recentMeal = {
  mealId: 1,
  athleteId: 1,
  date: nowIso,
  createdAt: nowIso,
  updatedAt: nowIso,
  mealType: "breakfast",
  items: [
    {
      food: "Oatmeal",
      quantity: "200g",
      calories: 300,
      macros: { protein: 10, carbs: 50, fats: 5 },
    },
  ],
};

const recentMeasurement = {
  measurementId: 1,
  athleteId: 1,
  date: nowIso,
  createdAt: nowIso,
  updatedAt: nowIso,
  weight: 75,
  weightUnit: "kg",
  bodyFatPct: 18,
  parts: { chest: { value: 100 } },
  notes: "",
};

test.describe("TRACK", () => {
  test.beforeEach(async ({ page, context }) => {
    await setupAthleteState(context, page);
  });

  test.describe("Happy Path", () => {
    test("TRACK.1 – Create workout", async ({ page }) => {
      await mockExerciseCatalogApi(page);
      await mockWorkoutsApi(page);
      await page.goto("/athlete/workouts");
      await page.getByRole("button", { name: "Pick Exercise" }).click();
      await page.getByPlaceholder("Search exercises...").fill("Bench");
      await page.getByText("Bench Press").first().click();
      await page.getByTestId("set-weight").fill("60");
      await page.getByTestId("set-reps").fill("8");
      await page.getByTestId("set-rest").fill("90");
      await page.getByRole("button", { name: "Log Workout" }).click();
      await expect(
        page.getByRole("tab", { name: "History (List)" }),
      ).toHaveAttribute("aria-selected", "true");
    });

    test("TRACK.2 – Edit workout (24h)", async ({ page }) => {
      await mockExerciseCatalogApi(page);
      await mockWorkoutsApi(page, [recentWorkout]);
      await page.goto("/athlete/workouts");
      await page.getByRole("tab", { name: "History (List)" }).click();
      await page.getByRole("button", { name: "Edit" }).first().click();
      await page.getByTestId("set-weight").fill("55");
      await page.getByRole("button", { name: "Save Changes" }).click();
      await expect(page.getByText("55 kg").first()).toBeVisible();
    });

    test("TRACK.3 – Delete workout (24h)", async ({ page }) => {
      await mockWorkoutsApi(page, [recentWorkout]);
      await page.goto("/athlete/workouts");
      await page.getByRole("tab", { name: "History (List)" }).click();
      await page.getByRole("button", { name: "Delete" }).first().click();
      await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
      await expect(page.getByText("No workouts recorded yet")).toBeVisible();
    });

    test("TRACK.4 – View workout history", async ({ page }) => {
      await mockWorkoutsApi(page, [recentWorkout]);
      await page.goto("/athlete/workouts");
      await page.getByRole("tab", { name: "History (List)" }).click();
      await pickDate(page, "workout-start-date", { year: 2025, month: 1, day: 1 });
      await pickDate(page, "workout-end-date", { year: 2025, month: 12, day: 31 });
      await page.getByRole("button", { name: "Apply" }).click();
      await expect(page.getByText("Bench Press")).toBeVisible();
    });

    test("TRACK.5 – View workout calendar", async ({ page }) => {
      await mockWorkoutsApi(page, [recentWorkout]);
      await page.goto("/athlete/workouts");
      await page.getByRole("tab", { name: "History (Calendar)" }).click();
      await expect(
        page.getByText("Workout Calendar"),
      ).toBeVisible();
    });
  });
  test.describe("Form Validations – Workout", () => {
    test.beforeEach(async ({ page }) => {
      await mockExerciseCatalogApi(page);
      await mockWorkoutsApi(page);
      await page.goto("/athlete/workouts");
    });

    test("TRACK.F1 – Workout weight negative", async ({ page }) => {
      await page.getByRole("button", { name: "Pick Exercise" }).click();
      await page.getByPlaceholder("Search exercises...").fill("Bench");
      await page.getByText("Bench Press").first().click();
      await page.getByTestId("set-weight").fill("-1");
      await page.getByRole("button", { name: "Log Workout" }).click();
      await expect(
        page.getByRole("tab", { name: "Log Workout" }),
      ).toHaveAttribute("aria-selected", "true");
    });

    test("TRACK.F2 – Workout reps min", async ({ page }) => {
      await page.getByRole("button", { name: "Pick Exercise" }).click();
      await page.getByPlaceholder("Search exercises...").fill("Bench");
      await page.getByText("Bench Press").first().click();
      await page.locator("[data-testid='set-reps']").evaluate((el: HTMLInputElement) => {
        el.value = "0";
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      });
      await page.getByRole("button", { name: "Log Workout" }).click();
      await expect(
        page.getByRole("tab", { name: "Log Workout" }),
      ).toHaveAttribute("aria-selected", "true");
    });

    test("TRACK.F3 – Workout exercise required", async ({ page }) => {
      await page.getByRole("button", { name: "Log Workout" }).click();
      await expect(
        page.getByRole("tab", { name: "Log Workout" }),
      ).toHaveAttribute("aria-selected", "true");
    });

    test("TRACK.F7 – Workout time format", async ({ page }) => {
      await page.getByRole("button", { name: "Pick Exercise" }).click();
      await page.getByPlaceholder("Search exercises...").fill("Bench");
      await page.getByText("Bench Press").first().click();
      await page.locator("#workoutTime").evaluate((el: HTMLInputElement) => {
        el.value = "25:00";
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      });
      await page.getByRole("button", { name: "Log Workout" }).click();
      await expect(
        page.getByRole("tab", { name: "Log Workout" }),
      ).toHaveAttribute("aria-selected", "true");
    });
  });

  test.describe("Happy Path – Meals", () => {
    test("TRACK.6 – Create meal", async ({ page }) => {
      await mockMealsApi(page);
      await page.goto("/athlete/meals");
      await page.getByRole("combobox").click();
      await page.getByRole("option", { name: "Lunch" }).click();
      await page.getByTestId("meal-food").fill("Chicken Breast");
      await page.getByTestId("meal-quantity").fill("200g");
      await page.getByTestId("meal-calories").fill("400");
      await page.getByTestId("meal-protein").fill("30");
      await page.getByTestId("meal-carbs").fill("0");
      await page.getByTestId("meal-fats").fill("10");
      await page.getByRole("button", { name: "Log Meal" }).click();
      await expect(
        page.getByRole("tab", { name: "History (List)" }),
      ).toHaveAttribute("aria-selected", "true");
    });

    test("TRACK.7 – Edit meal (24h)", async ({ page }) => {
      await mockMealsApi(page, [recentMeal]);
      await page.goto("/athlete/meals");
      await page.getByRole("tab", { name: "History (List)" }).click();
      await page.getByRole("button", { name: "Edit" }).first().click();
      await page.getByPlaceholder("e.g., 250").fill("350");
      await page.getByRole("button", { name: "Save Changes" }).click();
      await expect(page.getByText("350 kcal").first()).toBeVisible();
    });

    test("TRACK.8 – Delete meal (24h)", async ({ page }) => {
      await mockMealsApi(page, [recentMeal]);
      await page.goto("/athlete/meals");
      await page.getByRole("tab", { name: "History (List)" }).click();
      page.on("dialog", (dialog) => dialog.accept());
      await page.getByRole("button", { name: "Delete" }).first().click();
      await expect(page.getByText("No meals recorded yet")).toBeVisible();
    });

    test("TRACK.9 – View meal history", async ({ page }) => {
      await mockMealsApi(page, [recentMeal]);
      await page.goto("/athlete/meals");
      await page.getByRole("tab", { name: "History (List)" }).click();
      await pickDate(page, "meal-start-date", { year: 2025, month: 1, day: 1 });
      await pickDate(page, "meal-end-date", { year: 2025, month: 12, day: 31 });
      await page.getByRole("button", { name: "Apply" }).click();
      await expect(page.getByText("Oatmeal")).toBeVisible();
    });

    test("TRACK.10 – View meal calendar", async ({ page }) => {
      await mockMealsApi(page, [recentMeal]);
      await page.goto("/athlete/meals");
      await page.getByRole("tab", { name: "History (Calendar)" }).click();
      await expect(
        page.getByText("Meal Calendar"),
      ).toBeVisible();
    });
  });

  test.describe("Form Validations – Meal", () => {
    test.beforeEach(async ({ page }) => {
      await mockMealsApi(page);
      await page.goto("/athlete/meals");
    });

    test("TRACK.F8 – Meal food required", async ({ page }) => {
      await page.getByTestId("meal-quantity").fill("100g");
      await page.getByRole("button", { name: "Log Meal" }).click();
      await expect(
        page.getByRole("alert").filter({ hasText: /Food name is required/i }),
      ).toBeVisible();
    });

    test("TRACK.F9 – Meal quantity required", async ({ page }) => {
      await page.getByTestId("meal-food").fill("Rice");
      await page.getByRole("button", { name: "Log Meal" }).click();
      await expect(
        page.getByRole("alert").filter({ hasText: /Quantity is required/i }),
      ).toBeVisible();
    });

    test("TRACK.F10 – Meal calories negative", async ({ page }) => {
      await page.getByTestId("meal-food").fill("Rice");
      await page.getByTestId("meal-quantity").fill("100g");
      await page.getByTestId("meal-calories").fill("-10");
      await page.getByRole("button", { name: "Log Meal" }).click();
      await expect(
        page.getByRole("alert").filter({ hasText: /Calories cannot be negative/i }),
      ).toBeVisible();
    });

    test("TRACK.F11 – Meal macros negative", async ({ page }) => {
      await page.getByTestId("meal-food").fill("Rice");
      await page.getByTestId("meal-quantity").fill("100g");
      await page.getByTestId("meal-protein").fill("-1");
      await page.getByRole("button", { name: "Log Meal" }).click();
      await expect(
        page.getByRole("alert").filter({ hasText: /Value cannot be negative/i }),
      ).toBeVisible();
    });

    test("TRACK.F14 – Meal time format", async ({ page }) => {
      await page.getByTestId("meal-food").fill("Rice");
      await page.getByTestId("meal-quantity").fill("100g");
      await page.locator("#mealTime").evaluate((el: HTMLInputElement) => { el.value = "25:00"; el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true })); });
      await page.getByRole("button", { name: "Log Meal" }).click();
      await expect(
        page.getByRole("alert").filter({ hasText: /Invalid time format/i }),
      ).toBeVisible();
    });
  });

  test.describe("Happy Path – Measurements", () => {
    test("TRACK.11 – Create body measurement", async ({ page }) => {
      await mockMeasurementsApi(page);
      await page.goto("/athlete/measurements");
      await page.getByLabel("Weight").fill("76");
      await page.getByLabel("Body Fat %", { exact: false }).fill("19");
      await page.getByLabel("Chest").fill("101");
      await page.getByLabel("Notes").fill("Feeling good");
      await page.getByRole("button", { name: "Save Measurement" }).click();
      await expect(
        page.getByRole("tab", { name: "History" }),
      ).toHaveAttribute("aria-selected", "true");
    });

    test("TRACK.12 – Edit measurement (24h)", async ({ page }) => {
      await mockMeasurementsApi(page, [recentMeasurement]);
      await page.goto("/athlete/measurements");
      await page.getByRole("tab", { name: "History" }).click();
      await page.getByRole("button", { name: "Edit" }).first().click();
      await page.getByLabel("Weight").fill("74");
      await page.getByRole("button", { name: "Update" }).click();
      await expect(page.getByText("74.0 kg").first()).toBeVisible();
    });

    test("TRACK.13 – Delete measurement (24h)", async ({ page }) => {
      await mockMeasurementsApi(page, [recentMeasurement]);
      await page.goto("/athlete/measurements");
      await page.getByRole("tab", { name: "History" }).click();
      await page.getByRole("button", { name: "Delete" }).first().click();
      await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
      await expect(page.getByText(/measurements recorded yet/i)).toBeVisible();
    });

    test("TRACK.14 – View measurement charts", async ({ page }) => {
      await mockMeasurementsApi(page, [recentMeasurement]);
      await page.goto("/athlete/measurements");
      await page.getByRole("tab", { name: "Progress Charts" }).click();
      await expect(page.locator("svg.recharts-surface").first()).toBeVisible();
    });

    test("TRACK.15 – View latest measurement", async ({ page }) => {
      await page.goto("/athlete/measurements");
      await expect(page.getByText("Latest").first()).toBeVisible();
      await expect(page.getByText("75.5 kg").first()).toBeVisible();
    });
  });

  test.describe("Form Validations – Measurement", () => {
    test.beforeEach(async ({ page }) => {
      await mockMeasurementsApi(page);
      await page.goto("/athlete/measurements");
    });

    test("TRACK.F15 – Measurement weight positive", async ({ page }) => {
      await page.getByLabel("Weight").fill("0");
      await page.getByRole("button", { name: "Save Measurement" }).click();
      await expect(
        page.getByRole("alert").filter({ hasText: /Weight must be greater than 0/i }),
      ).toBeVisible();
    });

    test("TRACK.F16 – Measurement body fat range", async ({ page }) => {
      await page.getByLabel("Weight").fill("70");
      await page.getByLabel("Body Fat %", { exact: false }).fill("101");
      await page.getByRole("button", { name: "Save Measurement" }).click();
      await expect(
        page.getByRole("alert").filter({ hasText: /Body fat cannot exceed 100%/i }),
      ).toBeVisible();
    });

    test("TRACK.F17 – Measurement parts range", async ({ page }) => {
      await page.getByLabel("Weight").fill("70");
      await page.getByLabel("Chest").fill("501");
      await page.getByRole("button", { name: "Save Measurement" }).click();
      await expect(
        page.getByRole("alert").filter({ hasText: /Value is unrealistically large/i }),
      ).toBeVisible();
    });

    test("TRACK.F18 – Measurement notes limit", async ({ page }) => {
      await page.getByLabel("Weight").fill("70");
      await page.getByLabel("Notes").fill("a".repeat(501));
      await page.getByRole("button", { name: "Save Measurement" }).click();
      await expect(
        page.getByRole("alert").filter({ hasText: /Notes cannot exceed 500 characters/i }),
      ).toBeVisible();
    });

    test("TRACK.F19 – Measurement time format", async ({ page }) => {
      await page.getByLabel("Weight").fill("70");
      await page.locator("#measurement-time").evaluate((el: HTMLInputElement) => { el.value = "25:00"; el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true })); });
      await page.getByRole("button", { name: "Save Measurement" }).click();
      await expect(
        page.getByRole("alert").filter({ hasText: /Invalid time format/i }),
      ).toBeVisible();
    });
  });

  test.describe("Comments", () => {
    test("TRACK.16 – Add comment", async ({ page }) => {
      await mockWorkoutsApi(page, [recentWorkout]);
      await mockCommentsApi(page);
      await page.goto("/athlete/workouts");
      await page.getByRole("tab", { name: "History (List)" }).click();
      await page.getByRole("button", { name: "Comments" }).first().click();
      await page.getByPlaceholder("Your comment").fill("Great session");
      await page.getByRole("button", { name: "Submit" }).click();
      await expect(page.getByText("Great session")).toBeVisible();
    });

    test("TRACK.17 – Reply to comment", async ({ page }) => {
      const comment = {
        id: 1,
        targetType: "workout",
        targetId: 1,
        authorId: 2,
        content: "Nice work",
        createdAt: nowIso,
        replies: [],
      };
      await mockWorkoutsApi(page, [recentWorkout]);
      await mockCommentsApi(page, [comment]);
      await page.goto("/athlete/workouts");
      await page.getByRole("tab", { name: "History (List)" }).click();
      await page.getByRole("button", { name: "Comments" }).first().click();
      await page.getByRole("button", { name: "Reply" }).first().click();
      await page.getByPlaceholder("Write a reply...").fill("Thanks");
      await page.getByRole("button", { name: "Submit" }).click();
      await expect(page.getByText("Thanks")).toBeVisible();
    });
  });

  test.describe("Form Validations – Comment", () => {
    test.beforeEach(async ({ page }) => {
      await mockWorkoutsApi(page, [recentWorkout]);
      await mockCommentsApi(page);
      await page.goto("/athlete/workouts");
      await page.getByRole("tab", { name: "History (List)" }).click();
      await page.getByRole("button", { name: "Comments" }).first().click();
    });

    test("TRACK.F20 – Comment content empty", async ({ page }) => {
      await page.getByRole("button", { name: "Submit" }).click();
      await expect(
        page.getByRole("alert").filter({ hasText: /Content is required/i }),
      ).toBeVisible();
    });

    test("TRACK.F21 – Comment content max", async ({ page }) => {
      await page.getByPlaceholder("Your comment").fill("a".repeat(1001));
      await page.getByRole("button", { name: "Submit" }).click();
      await expect(
        page.getByRole("alert").filter({ hasText: /Content must be less than 1000 characters/i }),
      ).toBeVisible();
    });
  });
});

