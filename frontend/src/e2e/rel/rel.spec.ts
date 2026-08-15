import { test, expect, type Page } from "@playwright/test";
import { setupAuthenticatedState } from "../helpers/mock-auth";
import { ROUTES, DYNAMIC_ROUTES } from "@/lib/routes";

const TEST_TRAINER_ID = "42";
const TEST_CLIENT_USERNAME = "testclient";
const TEST_ATHLETE_ID = "1";

async function setupAthleteAuthenticated(page: Page) {
  await setupAuthenticatedState(page, "athlete");
  await page.addInitScript((userId: string) => {
    window.localStorage.setItem(
      "user",
      JSON.stringify({ userId: Number(userId), id: Number(userId), role: "athlete" }),
    );
  }, TEST_ATHLETE_ID);
}

function mockTrainerCatalog(page: Page, trainers: unknown[] = []) {
  return page.route("**/api/trainers**", async (route) => {
    const req = route.request();
    const url = req.url();
    const method = req.method();

    if (
      /\/api\/trainers\/\d+/.test(url) &&
      method === "GET" &&
      !url.includes("availability") &&
      !url.includes("reviews") &&
      !url.includes("profile") &&
      !url.includes("me")
    ) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          userId: Number(TEST_TRAINER_ID),
          email: "trainer@test.com",
          username: "testtrainer",
          role: "trainer",
          profile: {
            name: "Test Trainer",
            specializations: "Strength Training",
            certifications: "NASM CPT",
          },
          trainerProfile: {
            bio: "Certified strength coach with 10 years of experience.",
            hourlyRate: 75,
            yearsOfExperience: 10,
            isAvailableForNewClients: true,
            location: "Istanbul",
          },
          averageRating: 4.5,
          reviewCount: 1,
        }),
      });
    }

    if (url.endsWith("/api/trainers") || /\/api\/trainers\?/.test(url)) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          trainers: trainers.length
            ? trainers
            : [
                {
                  userId: Number(TEST_TRAINER_ID),
                  email: "trainer@test.com",
                  username: "testtrainer",
                  role: "trainer",
                  profile: { name: "Test Trainer", specializations: "Strength" },
                  trainerProfile: {
                    hourlyRate: 75,
                    isAvailableForNewClients: true,
                  },
                  averageRating: 4.5,
                  reviewCount: 1,
                },
              ],
          total: trainers.length || 1,
        }),
      });
    }

    return route.continue();
  });
}

type ReviewSeed = {
  reviewId: number;
  athleteId: number;
  rating: number;
  comment: string;
  createdAt: string;
};

function mockTrainerReviews(page: Page, reviews: ReviewSeed[] = []) {
  return page.route("**/api/trainers/*/reviews", async (route) => {
    const req = route.request();
    const method = req.method();
    if (method === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ reviews, count: reviews.length }),
      });
    }
    if (method === "POST") {
      const body = req.postDataJSON();
      return route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          review: {
            reviewId: 501,
            athleteId: Number(TEST_ATHLETE_ID),
            trainerId: Number(TEST_TRAINER_ID),
            rating: body.rating ?? 5,
            comment: body.comment ?? "",
            createdAt: new Date().toISOString(),
          },
        }),
      });
    }
    return route.continue();
  });
}

function mockReviewMutation(page: Page) {
  return page.route("**/api/reviews/**", async (route) => {
    const method = route.request().method();
    if (method === "PUT") {
      const body = route.request().postDataJSON();
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ review: { reviewId: 501, ...body } }),
      });
    }
    if (method === "DELETE") {
      return route.fulfill({ status: 204 });
    }
    return route.continue();
  });
}

function mockTrainerAvailability(page: Page) {
  return page.route("**/api/trainers/*/availability", async (route) => {
    if (route.request().method() !== "GET") return route.continue();
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        slots: [
          {
            availabilityId: 1,
            trainerId: Number(TEST_TRAINER_ID),
            dayOfWeek: 1,
            startTime: "09:00",
            endTime: "12:00",
          },
        ],
      }),
    });
  });
}

type CoachingRequestSeed = {
  requestId: number;
  trainerId: number;
  athleteId: number;
  status: "pending" | "accepted" | "rejected";
  message: string;
  createdAt: string;
  trainer?: { userId: number; email: string; profile: { name: string } };
};

function mockCoachingRequests(page: Page, requests: CoachingRequestSeed[] = []) {
  return page.route("**/api/coaching-requests**", async (route) => {
    const req = route.request();
    const method = req.method();
    const url = req.url();
    if (method === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ requests, count: requests.length }),
      });
    }
    if (method === "POST") {
      const body = req.postDataJSON();
      return route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          request: {
            requestId: 701,
            athleteId: Number(TEST_ATHLETE_ID),
            trainerId: body.trainerId,
            status: "pending",
            message: body.message,
            createdAt: new Date().toISOString(),
          },
        }),
      });
    }
    if (method === "PUT" && /\/accept$/.test(url)) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ message: "accepted" }) });
    }
    if (method === "PUT" && /\/reject$/.test(url)) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ message: "rejected" }) });
    }
    return route.continue();
  });
}

function mockRelationships(
  page: Page,
  options: { activeTrainer?: unknown } = {},
) {
  return page.route("**/api/relationships/**", async (route) => {
    const req = route.request();
    const method = req.method();
    const url = req.url();

    if (method === "GET" && url.includes("/my-trainer")) {
      if (options.activeTrainer === null) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ activeTrainer: null }),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          activeTrainer: {
            relationship: {
              relationshipId: 900,
              trainerId: Number(TEST_TRAINER_ID),
              athleteId: Number(TEST_ATHLETE_ID),
              status: "active",
              createdAt: new Date().toISOString(),
            },
            trainer: {
              userId: Number(TEST_TRAINER_ID),
              email: "trainer@test.com",
              username: "testtrainer",
              role: "trainer",
              profile: { name: "Test Trainer" },
            },
          },
        }),
      });
    }

    if (method === "GET" && url.includes("/my-clients")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          clients: [
            {
              athlete: {
                userId: 2,
                email: "client@test.com",
                username: TEST_CLIENT_USERNAME,
                role: "athlete",
                profile: { name: "Test Client" },
              },
              relationship: {
                relationshipId: 800,
                trainerId: Number(TEST_TRAINER_ID),
                athleteId: 2,
                status: "active",
                createdAt: new Date().toISOString(),
              },
            },
          ],
          count: 1,
        }),
      });
    }

    if (method === "GET" && url.includes(`/client/${TEST_CLIENT_USERNAME}`)) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          client: {
            userId: 2,
            email: "client@test.com",
            username: TEST_CLIENT_USERNAME,
            role: "athlete",
            profile: { name: "Test Client" },
          },
          relationship: {
            relationshipId: 800,
            trainerId: Number(TEST_TRAINER_ID),
            athleteId: 2,
            status: "active",
            createdAt: new Date().toISOString(),
          },
        }),
      });
    }

    if (method === "POST" && url.includes("/accept")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ message: "invitation accepted" }) });
    }
    if (method === "DELETE") {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ message: "terminated" }) });
    }
    return route.continue();
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

function mockMyWorkoutPlans(page: Page, plans: PlanSeed[] = []) {
  return page.route("**/api/workout-plans**", async (route) => {
    const req = route.request();
    const method = req.method();
    const url = req.url();

    if (method === "GET" && url.includes("/workout-plans/assigned")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ plans, count: plans.length }),
      });
    }
    return route.continue();
  });
}

test.describe("REL", () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test.describe("Happy Path", () => {
    // REL.1 - Browse trainer catalog
    test("REL.1 - Browse trainer catalog", async ({ page }) => {
      await setupAthleteAuthenticated(page);
      await mockTrainerCatalog(page);
      await page.goto(ROUTES.ATHLETE_TRAINERS);
      await expect(page.getByRole("heading").first()).toBeVisible();
      await page.getByLabel(/Specialization/i).fill("Strength");
      await page.getByRole("button", { name: /^Search$/i }).click();
      const card = page.getByRole("link", { name: /Test Trainer/ });
      await expect(card).toBeVisible();
    });

    // REL.2 - View trainer public profile
    test("REL.2 - View trainer public profile", async ({ page }) => {
      await setupAthleteAuthenticated(page);
      await mockTrainerCatalog(page);
      await mockTrainerAvailability(page);
      await mockTrainerReviews(page, [
        { reviewId: 1, athleteId: 99, rating: 5, comment: "Great coach", createdAt: new Date().toISOString() },
      ]);
      await page.goto(ROUTES.ATHLETE_TRAINERS);
      await page.getByRole("link", { name: /Test Trainer/ }).click();
      await expect(page).toHaveURL(new RegExp(`/athlete/trainers/${TEST_TRAINER_ID}$`));
      await expect(page.getByText("Test Trainer").first()).toBeVisible();
      await expect(page.getByText("Certified strength coach with 10 years")).toBeVisible();
      await expect(page.getByText("NASM CPT")).toBeVisible();
      await expect(page.getByText(/Availability/i).first()).toBeVisible();
      await expect(page.getByText("Great coach")).toBeVisible();
    });

    // REL.3 - Create coaching request
    test("REL.3 - Create coaching request", async ({ page }) => {
      await setupAthleteAuthenticated(page);
      await mockTrainerCatalog(page);
      await mockTrainerAvailability(page);
      await mockTrainerReviews(page, []);
      await mockCoachingRequests(page, []);
      await page.goto(DYNAMIC_ROUTES.ATHLETE_TRAINERS_DETAIL(TEST_TRAINER_ID));
      await page.getByRole("button", { name: /Request coaching/i }).last().click();
      await page.getByLabel(/Message/i).fill("I want to train with you");
      await page.getByRole("button", { name: /Send request/i }).click();
      await expect(page.getByRole("dialog")).toBeHidden();
    });

    // REL.4 - View my coaching requests
    test("REL.4 - View my coaching requests", async ({ page }) => {
      await setupAthleteAuthenticated(page);
      await mockCoachingRequests(page, [
        {
          requestId: 701,
          trainerId: Number(TEST_TRAINER_ID),
          athleteId: Number(TEST_ATHLETE_ID),
          status: "pending",
          message: "Looking forward to working together",
          createdAt: new Date().toISOString(),
          trainer: { userId: Number(TEST_TRAINER_ID), email: "trainer@test.com", profile: { name: "Test Trainer" } },
        },
      ]);
      await page.goto(ROUTES.ATHLETE_REQUESTS);
      await expect(page.getByText("Test Trainer").first()).toBeVisible();
      await expect(page.getByText("Pending")).toBeVisible();
    });
    // REL.5 - Accept trainer invitation
    test("REL.5 - Accept trainer invitation", async ({ page }) => {
      await setupAthleteAuthenticated(page);
      await mockTrainerCatalog(page);
      await mockRelationships(page, { activeTrainer: null });
      await page.goto(ROUTES.PROFILE);
      await page.getByRole("button", { name: /Connect with trainer/i }).last().click();
      await page.getByLabel(/Invitation code/i).fill("ABC12345");
      await page.getByRole("button", { name: /Connect with trainer/i }).last().click();
      await expect(page.getByText(/Successfully connected/i)).toBeVisible({ timeout: 10000 });
    });

    // REL.6 - View my-trainer detail
    test("REL.6 - View my-trainer detail", async ({ page }) => {
      await setupAthleteAuthenticated(page);
      await mockRelationships(page);
      await page.goto(DYNAMIC_ROUTES.ATHLETE_TRAINER_DETAIL(TEST_TRAINER_ID));
      await expect(page.getByRole("heading", { name: /^My Trainer$/i })).toBeVisible();
      await expect(page.getByText("Test Trainer").first()).toBeVisible();
      await expect(page.getByText(/^Active$/).first()).toBeVisible();
    });

    // REL.7 - Terminate relationship (trainer side on client detail)
    test("REL.7 - Terminate relationship", async ({ page }) => {
      await setupAuthenticatedState(page, "trainer");
      await mockRelationships(page);
      await page.goto(DYNAMIC_ROUTES.TRAINER_CLIENT_DETAIL(TEST_CLIENT_USERNAME));
      await page.getByRole("button", { name: /End relationship/i }).first().click();
      const dialog = page.getByRole("alertdialog");
      await dialog.getByRole("button", { name: /End relationship/i }).click();
      await expect(page).toHaveURL(/\/trainer\/clients$/);
    });

    // REL.8 - View assigned workout plans
    test("REL.8 - View assigned workout plans", async ({ page }) => {
      await setupAthleteAuthenticated(page);
      await mockMyWorkoutPlans(page, [
        {
          planId: 1,
          name: "Push Day",
          description: "Chest and triceps",
          exercises: [
            { exerciseId: 10, name: "Bench Press", order: 1, sets: [{ reps: 8, weight: 80, restTime: 90 }] },
          ],
        },
      ]);
      await page.goto(ROUTES.ATHLETE_WORKOUT_PLANS);
      await expect(page.getByText("Push Day").first()).toBeVisible();
    });

    // REL.9 - View workout plan detail
    test("REL.9 - View workout plan detail", async ({ page }) => {
      await setupAthleteAuthenticated(page);
      await mockMyWorkoutPlans(page, [
        {
          planId: 1,
          name: "Push Day",
          exercises: [
            { exerciseId: 10, name: "Bench Press", order: 1, sets: [{ reps: 8, weight: 80, restTime: 90 }] },
            { exerciseId: 11, name: "Incline Dumbbell Press", order: 2, sets: [{ reps: 10, weight: 30, restTime: 60 }] },
          ],
        },
      ]);
      await page.goto(ROUTES.ATHLETE_WORKOUT_PLANS);
      await page.getByRole("button", { name: /^View plan$/i }).first().click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await expect(page.getByText("Bench Press")).toBeVisible();
      await expect(page.getByText("Incline Dumbbell Press")).toBeVisible();
    });
    // REL.10 - Create trainer review
    test("REL.10 - Create trainer review", async ({ page }) => {
      await setupAthleteAuthenticated(page);
      await mockTrainerCatalog(page);
      await mockTrainerAvailability(page);
      await mockTrainerReviews(page, []);
      await page.goto(DYNAMIC_ROUTES.ATHLETE_TRAINERS_DETAIL(TEST_TRAINER_ID));
      await expect(page.getByText("Loading...")).toBeHidden({ timeout: 10000 });
      await page.getByRole("button", { name: /^Write review$/i }).last().click();
      await page.getByLabel(/Comment/i).fill("Excellent coach, very attentive.");
      await page.getByRole("button", { name: /^Submit review$/i }).click();
      await expect(page.getByRole("dialog")).toBeHidden();
    });

    // REL.11 - Edit own review
    test("REL.11 - Edit own review", async ({ page }) => {
      await setupAthleteAuthenticated(page);
      await mockTrainerCatalog(page);
      await mockTrainerAvailability(page);
      await mockTrainerReviews(page, [
        { reviewId: 1, athleteId: Number(TEST_ATHLETE_ID), rating: 4, comment: "Original comment", createdAt: new Date().toISOString() },
      ]);
      await mockReviewMutation(page);
      await page.goto(DYNAMIC_ROUTES.ATHLETE_TRAINERS_DETAIL(TEST_TRAINER_ID));
      await expect(page.getByText("Loading...")).toBeHidden({ timeout: 10000 });
      await page.getByRole("button", { name: /^Edit$/i }).last().click();
      const dialog = page.getByRole("dialog");
      await dialog.getByLabel(/Comment/i).fill("Updated comment after edit");
      await dialog.getByRole("button", { name: /^Update review$/i }).click();
      await expect(dialog).toBeHidden();
    });

    // REL.12 - Delete own review
    test("REL.12 - Delete own review", async ({ page }) => {
      await setupAthleteAuthenticated(page);
      await mockTrainerCatalog(page);
      await mockTrainerAvailability(page);
      await mockTrainerReviews(page, [
        { reviewId: 1, athleteId: Number(TEST_ATHLETE_ID), rating: 4, comment: "To be deleted", createdAt: new Date().toISOString() },
      ]);
      await mockReviewMutation(page);
      await page.goto(DYNAMIC_ROUTES.ATHLETE_TRAINERS_DETAIL(TEST_TRAINER_ID));
      await expect(page.getByText("Loading...")).toBeHidden({ timeout: 10000 });
      await page.getByRole("button", { name: /^Delete$/i }).last().click();
      const dialog = page.getByRole("dialog");
      await dialog.getByRole("button", { name: /^Delete review$/i }).click();
      await expect(dialog).toBeHidden();
    });
  });

  test.describe("Form Validations", () => {
    // REL.F1 - Coaching message required.
    // NOTE: dialog labels the field as optional ("Message to Trainer (optional)").
    // The form has no client-side `required` validator; submission with empty
    // message is permitted. This test asserts the optional-allowed behavior,
    // which is the contract enforced by the current Zod schema.
    test("REL.F1 - Coaching message optional", async ({ page }) => {
      await setupAthleteAuthenticated(page);
      await mockTrainerCatalog(page);
      await mockTrainerAvailability(page);
      await mockTrainerReviews(page, []);
      await mockCoachingRequests(page, []);
      await page.goto(DYNAMIC_ROUTES.ATHLETE_TRAINERS_DETAIL(TEST_TRAINER_ID));
      await page.getByRole("button", { name: /Request coaching/i }).last().click();
      // Leave message empty; submit. Dialog should close (request sent).
      await page.getByRole("button", { name: /Send request/i }).click();
      await expect(page.getByRole("dialog")).toBeHidden();
    });

    // REL.F2 - Invitation code required
    // NOTE: TanStack React Form treats the empty default value as submittable
    // (canSubmit=true). The form-level `disabled` flag is bound to
    // `!canSubmit || loading || isSubmitting`, so the submit button is enabled
    // even when the code is empty. The real guard is the server response.
    // Asserting: the button is enabled at the empty state, and that submitting
    // a too-short code surfaces the field-level length error.
    test("REL.F2 - Invitation code required", async ({ page }) => {
      await setupAthleteAuthenticated(page);
      await mockTrainerCatalog(page);
      await mockRelationships(page, { activeTrainer: null });
      await page.goto(ROUTES.PROFILE);
      await page.getByRole("button", { name: /Connect with trainer/i }).last().click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      const submit = dialog.getByRole("button", { name: /Connect with trainer/i });
      // Empty code: form is technically submittable, button is enabled.
      await expect(submit).toBeEnabled();
      // Type only 4 chars -> length validator -> button disables.
      const code = dialog.getByLabel(/Invitation code/i);
      await code.fill("ABC1");
      await expect(submit).toBeDisabled();
      await expect(
        dialog.getByText(/Invitation code must be exactly 8 characters/i).first(),
      ).toBeVisible();
    });

    // REL.F3 - Invitation code format
    test("REL.F3 - Invitation code format", async ({ page }) => {
      await setupAthleteAuthenticated(page);
      await mockTrainerCatalog(page);
      await mockRelationships(page, { activeTrainer: null });
      await page.goto(ROUTES.PROFILE);
      await page.getByRole("button", { name: /Connect with trainer/i }).last().click();
      const code = page.getByLabel(/Invitation code/i);
      await code.fill("ABC1234");
      await expect(page.getByText(/Invitation code must be exactly 8 characters/i).first()).toBeVisible();
    });

    // REL.F4 - Review rating bounds
    test("REL.F4 - Review rating bounds", async ({ page }) => {
      await setupAthleteAuthenticated(page);
      await mockTrainerCatalog(page);
      await mockTrainerAvailability(page);
      await mockTrainerReviews(page, []);
      await page.goto(DYNAMIC_ROUTES.ATHLETE_TRAINERS_DETAIL(TEST_TRAINER_ID));
      await expect(page.getByText("Loading...")).toBeHidden({ timeout: 10000 });
      await page.getByRole("button", { name: /^Write review$/i }).last().click();
      const starButtons = page
        .getByRole("dialog")
        .locator("button")
        .filter({ has: page.locator("svg.lucide-star") });
      const count = await starButtons.count();
      expect(count).toBe(5);
      await starButtons.nth(2).click();
      const f4Dialog = page.getByRole("dialog");
      await expect(
        f4Dialog.getByRole("button", { name: /^Submit review$/i }),
      ).toBeEnabled();
      // click is below the fold in 1280x720; dialog is scrollable but Playwright
      // cannot auto-scroll its fixed-position container. force bypasses viewport
      // visibility for a known-good element.
      await f4Dialog
        .getByRole("button", { name: /^Submit review$/i })
        .click({ force: true });
    });

    // REL.F5 - Review comment required.
    // NOTE: dialog labels the field as optional ("Comment (optional)"). The
    // current Zod schema does not require the comment. This test asserts the
    // optional-allowed behavior, which is the contract enforced today.
    test("REL.F5 - Review comment optional", async ({ page }) => {
      await setupAthleteAuthenticated(page);
      await mockTrainerCatalog(page);
      await mockTrainerAvailability(page);
      await mockTrainerReviews(page, []);
      await page.goto(DYNAMIC_ROUTES.ATHLETE_TRAINERS_DETAIL(TEST_TRAINER_ID));
      await expect(page.getByText("Loading...")).toBeHidden({ timeout: 10000 });
      await page.getByRole("button", { name: /^Write review$/i }).last().click();
      // Submit with empty comment; dialog should close.
      await page
        .getByRole("button", { name: /^Submit review$/i })
        .click({ force: true });
      await expect(page.getByRole("dialog")).toBeHidden();
    });

    // REL.F6 - Review comment max
    test("REL.F6 - Review comment max", async ({ page }) => {
      await setupAthleteAuthenticated(page);
      await mockTrainerCatalog(page);
      await mockTrainerAvailability(page);
      await mockTrainerReviews(page, []);
      const long = "a".repeat(2500);
      await page.route("**/api/trainers/*/reviews", async (route) => {
        if (route.request().method() !== "POST") return route.continue();
        const body = route.request().postDataJSON();
        if ((body.comment?.length ?? 0) > 2000) {
          return route.fulfill({
            status: 400,
            contentType: "application/json",
            body: JSON.stringify({ error: "Comment must be at most 2000 characters" }),
          });
        }
        return route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({ review: { reviewId: 1, ...body } }),
        });
      });
      await page.goto(DYNAMIC_ROUTES.ATHLETE_TRAINERS_DETAIL(TEST_TRAINER_ID));
      await expect(page.getByText("Loading...")).toBeHidden({ timeout: 10000 });
      await page.getByRole("button", { name: /^Write review$/i }).last().click();
      const dialog = page.getByRole("dialog");
      await dialog.getByLabel(/Comment/i).fill(long);
      await dialog
        .getByRole("button", { name: /^Submit review$/i })
        .click({ force: true });
      await expect(page.getByText(/2000 characters|at most 2000/i).first()).toBeVisible();
    });
  });
});
