import { test, expect } from "@playwright/test";
import { ROUTES } from "@/lib/routes";

test.describe.serial("Meals Page", () => {
  test.beforeEach(async ({ page }) => {
    // Mock auth endpoint to return logged-in athlete
    await page.route(/\/api\/auth\/me/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          userId: "1",
          username: "testathlete",
          email: "athlete@test.com",
          role: "athlete",
          profile: { name: "Test Athlete" },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      });
    });

    // Mock GET meals endpoint
    await page.route(/\/api\/meals/, async (route) => {
      const url = new URL(route.request().url());
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            meals: [],
            totalCount: 0,
            page: 1,
            pageSize: 10,
          }),
        });
      } else if (route.request().method() === "POST") {
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            message: "Meal recorded successfully",
            meal: {
              mealId: "1",
              date: new Date().toISOString(),
              mealType: "breakfast",
              items: [],
              totalCalories: 0,
            },
          }),
        });
      }
    });

    // Navigate to meals page
    await page.goto(ROUTES.ATHLETE_MEALS);
  });

  // Test ID: M1 – Page renders title and description
  test("meals: renders page title and description", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Meals & Nutrition" })).toBeVisible();
    await expect(page.getByText("Track your nutrition to reach your goals.")).toBeVisible();
  });

  // Test ID: M2 – Shows all 3 tab triggers
  test("meals: shows all 3 tab triggers", async ({ page }) => {
    await expect(page.getByRole("tab", { name: "Log Meal" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "History (List)" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "History (Calendar)" })).toBeVisible();
  });

  // Test ID: M3 – Defaults to log tab
  test("meals: defaults to log tab showing MealForm", async ({ page }) => {
    await expect(page.getByRole("tab", { name: "Log Meal" })).toBeSelected();
    await expect(page.getByRole("heading", { name: "Log New Meal" })).toBeVisible();
    await expect(page.getByText("Record what you ate.")).toBeVisible();
  });

  // Test ID: M4 – Switches to list tab
  test("meals: switches to list tab", async ({ page }) => {
    await page.getByRole("tab", { name: "History (List)" }).click();
    await expect(page.getByRole("tab", { name: "History (List)" })).toBeSelected();
  });

  // Test ID: M5 – Switches to calendar tab
  test("meals: switches to calendar tab", async ({ page }) => {
    await page.getByRole("tab", { name: "History (Calendar)" }).click();
    await expect(page.getByRole("tab", { name: "History (Calendar)" })).toBeSelected();
  });

  // Test ID: M6 – Switches back to log tab
  test("meals: switches back to log tab", async ({ page }) => {
    await page.getByRole("tab", { name: "History (List)" }).click();
    await page.getByRole("tab", { name: "Log Meal" }).click();
    await expect(page.getByRole("tab", { name: "Log Meal" })).toBeSelected();
    await expect(page.getByRole("heading", { name: "Log New Meal" })).toBeVisible();
  });

  // Test ID: M7 – Meal form submission switches to list tab
  test("meals: form submission switches to list tab", async ({ page }) => {
    // Fill meal type
    await page.getByRole("combobox", { name: /meal type|meal/i }).click();
    await page.getByRole("option", { name: "Breakfast" }).click();

    // Fill food item
    await page.getByLabel(/food|item name/i).fill("Apple");

    // Fill quantity
    await page.getByLabel(/quantity/i).fill("1");

    // Fill calories
    await page.getByLabel(/calories/i).fill("95");

    // Submit form
    await page.getByRole("button", { name: /log|submit|save/i }).click();

    // Should switch to list tab
    await expect(page.getByRole("tab", { name: "History (List)" })).toBeSelected();
  });

  // Test ID: M8 – Empty meal list state
  test("meals: empty meal list shows no meals message", async ({ page }) => {
    await page.getByRole("tab", { name: "History (List)" }).click();
    await expect(page.getByText("No meals recorded yet")).toBeVisible();
  });

  // Test ID: M9 – Meal list displays meals
  test("meals: meal list displays meals when data exists", async ({ page }) => {
    // Re-mock the API with data on this tab switch
    await page.route(/\/api\/meals/, async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            meals: [
              {
                mealId: "1",
                date: new Date().toISOString(),
                mealType: "breakfast",
                items: [
                  { food: "Oatmeal", quantity: "1 cup", calories: 150 },
                ],
                totalCalories: 150,
              },
            ],
            totalCount: 1,
            page: 1,
            pageSize: 10,
          }),
        });
      }
    });

    // Reload to trigger the new mock
    await page.goto(ROUTES.ATHLETE_MEALS);
    // Wait for page to settle
    await page.getByRole("tab", { name: "History (List)" }).click();
    await expect(page.getByText("Oatmeal")).toBeVisible();
  });

  // Test ID: M10 – Calendar renders
  test("meals: calendar tab renders calendar grid", async ({ page }) => {
    await page.getByRole("tab", { name: "History (Calendar)" }).click();
    // Calendar should be visible — look for a typical calendar landmark or grid
    await expect(page.getByRole("grid", { name: /calendar|date/i }).first()).toBeVisible();
  });
});