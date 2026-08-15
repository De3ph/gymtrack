import type { Page } from "@playwright/test";
import { mockGoBackend, setSessionCookie } from "./mock-auth";

export async function setupAthleteState(
  context: Parameters<typeof setSessionCookie>[0],
  page: Page,
  role: "athlete" | "trainer" = "athlete",
) {
  await setSessionCookie(context, role);
  await mockGoBackend(page, role);
}

export const testMuscleGroups = [{ id: 1, name: "Chest" }];
export const testEquipment = [{ id: 1, name: "Barbell" }];
export const testExercises = [
  {
    exerciseId: 1,
    name: "Bench Press",
    muscleGroupId: 1,
    equipmentId: 1,
  },
  {
    exerciseId: 2,
    name: "Squat",
    muscleGroupId: 1,
    equipmentId: 1,
  },
];

export function mockExerciseCatalogApi(page: Page) {
  return page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = request.url();

    if (request.method() !== "GET") return route.continue();

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

    if (url.includes("/exercises/search")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(testExercises),
      });
    }

    if (url.includes("/exercises")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: testExercises }),
      });
    }

    return route.continue();
  });
}

/** @deprecated use mockExerciseCatalogApi */
export function mockExercisesApi(page: Page) {
  return mockExerciseCatalogApi(page);
}

function parseId(url: string) {
  const match = url.match(/\/(\d+)(?:\?|$)/);
  return match ? Number(match[1]) : null;
}

export function mockWorkoutsApi(page: Page, initial: Record<string, unknown>[] = []) {
  const workouts: Record<string, unknown>[] = [...initial];
  return page.route("**/api/workouts**", async (route) => {
    const request = route.request();
    const method = request.method();
    const url = request.url();

    if (method === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: workouts,
          workouts,
          count: workouts.length,
          pagination: { page: 1, limit: 20, total: workouts.length },
        }),
      });
    }

    if (method === "POST") {
      const body = request.postDataJSON();
      const created = { ...body, id: 101, workoutId: 101, athleteId: 1 };
      workouts.push(created);
      return route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ data: created }),
      });
    }

    const id = parseId(url);
    if (method === "PUT" && id) {
      const body = request.postDataJSON();
      const idx = workouts.findIndex(
        (w) => w.workoutId === id || w.id === id,
      );
      if (idx >= 0) workouts[idx] = { ...workouts[idx], ...body };
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: { ...body, id } }),
      });
    }

    if (method === "DELETE" && id) {
      const idx = workouts.findIndex(
        (w) => w.workoutId === id || w.id === id,
      );
      if (idx >= 0) workouts.splice(idx, 1);
      return route.fulfill({ status: 204 });
    }

    return route.continue();
  });
}

export function mockMealsApi(page: Page, initial: Record<string, unknown>[] = []) {
  const meals: Record<string, unknown>[] = [...initial];
  return page.route("**/api/meals**", async (route) => {
    const request = route.request();
    const method = request.method();
    const url = request.url();

    if (method === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: meals,
          meals,
          count: meals.length,
          pagination: { page: 1, limit: 20, total: meals.length },
        }),
      });
    }

    if (method === "POST") {
      const body = request.postDataJSON();
      const created = { ...body, id: 201, mealId: 201, athleteId: 1 };
      meals.push(created);
      return route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ data: created }),
      });
    }

    const id = parseId(url);
    if (method === "PUT" && id) {
      const body = request.postDataJSON();
      const idx = meals.findIndex((m) => m.mealId === id || m.id === id);
      if (idx >= 0) meals[idx] = { ...meals[idx], ...body };
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: { ...body, id } }),
      });
    }

    if (method === "DELETE" && id) {
      const idx = meals.findIndex((m) => m.mealId === id || m.id === id);
      if (idx >= 0) meals.splice(idx, 1);
      return route.fulfill({ status: 204 });
    }

    return route.continue();
  });
}

export function mockMeasurementsApi(page: Page, initial: Record<string, unknown>[] = []) {
  const measurements: Record<string, unknown>[] = [...initial];
  return page.route("**/api/measurements**", async (route) => {
    const request = route.request();
    const method = request.method();
    const url = request.url();

    if (method === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: measurements,
          measurements,
          count: measurements.length,
          pagination: { page: 1, limit: 20, total: measurements.length },
        }),
      });
    }

    if (method === "POST") {
      const body = request.postDataJSON();
      const created = {
        ...body,
        id: 301,
        measurementId: 301,
        athleteId: 1,
      };
      measurements.push(created);
      return route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ data: created }),
      });
    }

    const id = parseId(url);
    if (method === "PUT" && id) {
      const body = request.postDataJSON();
      const idx = measurements.findIndex(
        (m) => m.measurementId === id || m.id === id,
      );
      if (idx >= 0) measurements[idx] = { ...measurements[idx], ...body };
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: { ...body, id } }),
      });
    }

    if (method === "DELETE" && id) {
      const idx = measurements.findIndex(
        (m) => m.measurementId === id || m.id === id,
      );
      if (idx >= 0) measurements.splice(idx, 1);
      return route.fulfill({ status: 204 });
    }

    return route.continue();
  });
}
export function mockCommentsApi(page: Page, comments: unknown[] = []) {
  return page.route("**/api/comments**", async (route) => {
    const request = route.request();
    const method = request.method();
    const url = request.url();

    if (method === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: comments }),
      });
    }

    if (method === "POST") {
      const body = request.postDataJSON();
      const created = {
        ...body,
        id: 401,
        authorId: 1,
        createdAt: new Date().toISOString(),
      };
      return route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ data: created }),
      });
    }

    const id = parseId(url);
    if (method === "PUT" && id) {
      const body = request.postDataJSON();
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: { ...body, id } }),
      });
    }

    if (method === "DELETE" && id) {
      return route.fulfill({ status: 204 });
    }

    return route.continue();
  });
}

export async function dismissDialog(page: Page) {
  const isOpen = await page
    .locator("[role='dialog']")
    .isVisible()
    .catch(() => false);
  if (isOpen) {
    await page.keyboard.press("Escape");
    await page.locator("[role='dialog']").waitFor({ state: "hidden" });
  }
}

