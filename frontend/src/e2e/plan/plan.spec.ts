import { test, expect, type Page } from "@playwright/test";
import { setupAuthenticatedState } from "../helpers/mock-auth";
import {
  testMuscleGroups,
  testEquipment,
  testExercises,
} from "../helpers/mock-athlete";
import { ROUTES } from "@/lib/routes";

const ATHLETE_ID = "1";

async function setupAthleteAuthenticated(page: Page) {
  await setupAuthenticatedState(page, "athlete");
  await page.addInitScript((userId: string) => {
    window.localStorage.setItem(
      "user",
      JSON.stringify({ userId: Number(userId), id: Number(userId), role: "athlete" }),
    );
  }, ATHLETE_ID);
}

function mockExerciseCatalog(page: Page) {
  return page.route(/\/api\/(muscle-groups|equipment|exercises\/search)/, async (route) => {
    const url = route.request().url();
    if (url.includes("/muscle-groups")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(testMuscleGroups),
      });
    }
    if (url.includes("/equipment")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(testEquipment),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(testExercises),
    });
  });
}

type PlanSeed = {
  planId: number;
  name: string;
  description?: string;
  exercises: Array<{
    exerciseId: number;
    name: string;
    order: number;
    sets: Array<{ reps: number; weight?: number; restTime?: number }>;
    notes?: string;
  }>;
};

const benchPress = {
  exerciseId: 10,
  name: "Bench Press",
  order: 1,
  sets: [{ reps: 8, weight: 80, restTime: 90 }],
};

function seedPlan(overrides: Partial<PlanSeed> & { name: string }): PlanSeed {
  return {
    planId: 1,
    description: "",
    exercises: [benchPress],
    ...overrides,
  };
}

function mockWorkoutPlansApi(page: Page, initialOwn: PlanSeed[] = []) {
  const own: PlanSeed[] = [...initialOwn];
  let nextId = 100;
  return page.route("**/api/workout-plans**", async (route) => {
    const req = route.request();
    const method = req.method();
    const url = req.url();

    if (method === "GET" && url.includes("/workout-plans/assigned")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ plans: [], count: 0 }),
      });
    }

    if (method === "GET" && url.includes("/workout-plans")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ plans: own, count: own.length }),
      });
    }

    if (method === "POST" && url.endsWith("/workout-plans")) {
      const body = req.postDataJSON();
      const created: PlanSeed = {
        planId: nextId++,
        name: body.name,
        description: body.description ?? "",
        exercises: body.exercises ?? [benchPress],
      };
      own.push(created);
      return route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ ...created }),
      });
    }

    const id = url.match(/\/workout-plans\/(\d+)/)?.[1];
    if (method === "PUT" && id) {
      const body = req.postDataJSON();
      const idx = own.findIndex((p) => p.planId === Number(id));
      if (idx >= 0) own[idx] = { ...own[idx], ...body, planId: Number(id) };
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ...own[idx] }),
      });
    }

    if (method === "DELETE" && id) {
      const idx = own.findIndex((p) => p.planId === Number(id));
      if (idx >= 0) own.splice(idx, 1);
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ message: "deleted" }),
      });
    }

    return route.continue();
  });
}

test.describe("PLAN", () => {
  test.beforeEach(async ({ page }) => {
    await setupAthleteAuthenticated(page);
  });

  test.describe("Happy Path", () => {
    test("PLAN.1 – Create own workout plan", async ({ page }) => {
      await mockWorkoutPlansApi(page);
      await mockExerciseCatalog(page);
      await page.goto(ROUTES.ATHLETE_WORKOUT_PLANS);

      await page.getByRole("button", { name: "Create Plan" }).click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();

      await dialog.getByPlaceholder("Exercise name").fill("Push Day");
      await dialog
        .getByPlaceholder("Brief description of the plan")
        .fill("Chest and triceps");
      await dialog.getByRole("button", { name: "Pick Exercise" }).click();
      await page.getByPlaceholder("Search exercises...").fill("Bench");
      await page.getByText("Bench Press").first().click();
      await expect(dialog.getByText("Bench Press")).toBeVisible();

      await dialog.getByRole("button", { name: "Create Plan" }).click();
      await expect(dialog).toBeHidden();
      await expect(page.getByText("Push Day")).toBeVisible();
      await expect(page.getByText("1/3 plans")).toBeVisible();
    });

    test("PLAN.2 – Edit own workout plan", async ({ page }) => {
      await mockWorkoutPlansApi(page, [
        seedPlan({ name: "Push Day", description: "Chest and triceps" }),
      ]);
      await mockExerciseCatalog(page);
      await page.goto(ROUTES.ATHLETE_WORKOUT_PLANS);

      await page.getByRole("button", { name: "Edit Plan" }).click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      await dialog.getByPlaceholder("Exercise name").fill("Pull Day");
      await dialog.getByRole("button", { name: "Update Plan" }).click();
      await expect(dialog).toBeHidden();
      await expect(page.getByText("Pull Day")).toBeVisible();
      await expect(page.getByText("Push Day")).toBeHidden();
    });

    test("PLAN.3 – Delete own workout plan", async ({ page }) => {
      await mockWorkoutPlansApi(page, [
        seedPlan({ name: "Push Day", description: "Chest and triceps" }),
      ]);
      await page.goto(ROUTES.ATHLETE_WORKOUT_PLANS);

      await page.getByRole("button", { name: "Delete Plan" }).click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      await dialog.getByRole("button", { name: "Delete", exact: true }).click();
      await expect(dialog).toBeHidden();
      await expect(
        page.getByText("No workout plans yet. Create your first one!"),
      ).toBeVisible();
      await expect(page.getByText("0/3 plans")).toBeVisible();
    });

    test("PLAN.4 – Plan limit reached at 3", async ({ page }) => {
      await mockWorkoutPlansApi(page, [
        seedPlan({ planId: 1, name: "Plan A" }),
        seedPlan({ planId: 2, name: "Plan B" }),
        seedPlan({ planId: 3, name: "Plan C" }),
      ]);
      await page.goto(ROUTES.ATHLETE_WORKOUT_PLANS);

      await expect(page.getByText("3/3 plans")).toBeVisible();
      await expect(
        page.getByText("You reached the maximum of 3 plans"),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Create Plan" }),
      ).toBeDisabled();
      await expect(page.getByText("Plan A")).toBeVisible();
      await expect(page.getByText("Plan B")).toBeVisible();
      await expect(page.getByText("Plan C")).toBeVisible();
    });
  });

  test.describe("Form Validations", () => {
    test("PLAN.F1 – Plan name required", async ({ page }) => {
      await mockWorkoutPlansApi(page);
      await mockExerciseCatalog(page);
      await page.goto(ROUTES.ATHLETE_WORKOUT_PLANS);

      await page.getByRole("button", { name: "Create Plan" }).click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();

      await dialog.getByRole("button", { name: "Create Plan" }).click();
      await expect(dialog).toBeVisible();
      await expect(page.getByText("0/3 plans")).toBeVisible();
    });
  });
});
