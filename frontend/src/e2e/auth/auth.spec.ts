import { test, expect } from "@playwright/test";
import {
  setupAuthenticatedState,
  mockGoBackend,
  mockSessionRoute,
} from "../helpers/mock-auth";

test.describe("AUTH", () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test.describe("Happy Path", () => {
    // AUTH.1 – View Landing Page
    test("AUTH.1 – View Landing Page", async ({ page }) => {
      await page.goto("/");
      await expect(
        page.getByRole("heading", { name: /Train smarter/i }),
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: /Start Free/i }),
      ).toBeVisible();
    });

    // AUTH.2 – Register Athlete
    test("AUTH.2 – Register Athlete", async ({ page }) => {
      await mockGoBackend(page, "athlete");
      await mockSessionRoute(page, "athlete");
      await page.goto("/register");
      await page.getByLabel("Username").pressSequentially("testathlete");
      await page.getByLabel("Email").pressSequentially("athlete@test.com");
      await page.getByLabel("Password", { exact: true }).pressSequentially("password123");
      await page.getByLabel("Confirm Password").pressSequentially("password123");
      await page.getByLabel("Full Name").pressSequentially("Test Athlete");
      await page.getByLabel("Age").pressSequentially("25");
      await page.getByLabel("Weight").pressSequentially("70");
      await page.getByLabel("Height").pressSequentially("175");
      await page.getByLabel("Fitness Goals").pressSequentially("Get stronger");
      await page.getByRole("button", { name: /Create Account/i }).click();
      await page.waitForURL(/\/dashboard/, { timeout: 15000 });
    });
    // AUTH.3 – Register Trainer
    test("AUTH.3 – Register Trainer", async ({ page }) => {
      await mockGoBackend(page, "trainer");
      await mockSessionRoute(page, "trainer");
      await page.goto("/register");
      await page.getByRole("radio", { name: "Trainer" }).click();
      await page.getByLabel("Username").pressSequentially("testtrainer");
      await page.getByLabel("Email").pressSequentially("trainer@test.com");
      await page.getByLabel("Password", { exact: true }).pressSequentially("password123");
      await page.getByLabel("Confirm Password").pressSequentially("password123");
      await page.getByLabel("Full Name").pressSequentially("Test Trainer");
      await page.getByLabel("Certifications").pressSequentially("NASM CPT");
      await page.getByLabel("Specializations").pressSequentially("Strength Training");
      await page.getByRole("button", { name: /Create Account/i }).click();
      await page.waitForURL(/\/dashboard/, { timeout: 15000 });
    });

    // AUTH.4 – Login Athlete
    test("AUTH.4 – Login Athlete", async ({ page }) => {
      await mockGoBackend(page, "athlete");
      await mockSessionRoute(page, "athlete");
      await page.goto("/login");
      await page.getByLabel("Email or Username").pressSequentially("testathlete");
      await page.getByLabel("Password", { exact: true }).pressSequentially("password123");
      await page.getByRole("button", { name: /Login/i }).click();
      await page.waitForURL(/\/dashboard/, { timeout: 15000 });
    });

    // AUTH.5 – Login Trainer
    test("AUTH.5 – Login Trainer", async ({ page }) => {
      await mockGoBackend(page, "trainer");
      await mockSessionRoute(page, "trainer");
      await page.goto("/login");
      await page.getByLabel("Email or Username").pressSequentially("testtrainer");
      await page.getByLabel("Password", { exact: true }).pressSequentially("password123");
      await page.getByRole("button", { name: /Login/i }).click();
      await page.waitForURL(/\/dashboard/, { timeout: 15000 });
    });

    // AUTH.6 – Logout
    test("AUTH.6 – Logout", async ({ page }) => {
      await setupAuthenticatedState(page, "athlete");
      await page.goto("/dashboard");
      await expect(
        page.getByRole("link", { name: "GymTrack" }),
      ).toBeVisible({ timeout: 10000 });
      await page.getByRole("button", { name: "TA" }).click();
      await page.getByRole("menuitem", { name: "Logout" }).click();
      await page.waitForURL(/\/login/, { timeout: 15000 });
    });

    // AUTH.7 – Session Recovery
    test("AUTH.7 – Session Recovery", async ({ page }) => {
      await setupAuthenticatedState(page, "athlete");
      await page.goto("/dashboard");
      await expect(
        page.getByRole("link", { name: "GymTrack" }),
      ).toBeVisible({ timeout: 10000 });
      await page.reload();
      await expect(
        page.getByRole("link", { name: "GymTrack" }),
      ).toBeVisible({ timeout: 10000 });
      await expect(page).toHaveURL(/\/dashboard/);
    });

    // AUTH.8 – Unauth Redirect
    test("AUTH.8 – Unauth Redirect", async ({ page }) => {
      await page.goto("/dashboard");
      await expect(page).toHaveURL(/\/login/);
      await expect(page).toHaveURL(/redirect=/);
    });

    // AUTH.9 – Role-gate Redirect
    test("AUTH.9 – Role-gate Redirect", async ({ page }) => {
      await setupAuthenticatedState(page, "athlete");
      await page.goto("/trainer/clients");
      await expect(page).toHaveURL(/\/dashboard/);
      await expect(
        page.getByRole("link", { name: "GymTrack" }),
      ).toBeVisible({ timeout: 10000 });
    });

    // AUTH.10 – Locale Switch
    test("AUTH.10 – Locale Switch", async ({ page }) => {
      await page.goto("/");
      await expect(
        page.getByRole("heading", { name: /Train smarter/i }),
      ).toBeVisible();
      await page
        .getByRole("button", { name: /Toggle language/i })
        .click();
      await expect(page).toHaveURL(/\/tr\/?$/);
      await page.waitForLoadState("domcontentloaded");
      await page
        .getByRole("button", { name: /Toggle language/i })
        .click();
      await expect(page).not.toHaveURL(/\/tr/);
      await expect(
        page.getByRole("heading", { name: /Train smarter/i }),
      ).toBeVisible();
    });
  });

  test.describe("Form Validations", () => {
    // AUTH.F1 – Login identifier required
    test("AUTH.F1 – Login identifier required", async ({ page }) => {
      await page.goto("/login");
      const field = page.getByLabel("Email or Username");
      await field.pressSequentially("x");
      await field.fill("");
      await expect(
        page.getByRole("alert").filter({ hasText: /Email or username is required/ }),
      ).toBeVisible();
    });

    // AUTH.F2 – Login identifier format
    test("AUTH.F2 – Login identifier format", async ({ page }) => {
      await page.goto("/login");
      await page.getByLabel("Email or Username").pressSequentially("x");
      await expect(
        page.getByRole("alert").filter({ hasText: /valid email or username/ }),
      ).toBeVisible();
    });

    // AUTH.F3 – Login password required
    test("AUTH.F3 – Login password required", async ({ page }) => {
      await page.goto("/login");
      const field = page.getByLabel("Password", { exact: true });
      await field.pressSequentially("x");
      await field.fill("");
      await expect(
        page.getByRole("alert").filter({ hasText: /Password is required/ }),
      ).toBeVisible();
    });

    // AUTH.F4 – Register username short
    test("AUTH.F4 – Register username short", async ({ page }) => {
      await page.goto("/register");
      await page.getByLabel("Username").pressSequentially("ab");
      await expect(
        page.getByRole("alert").filter({ hasText: /at least 3 characters/ }),
      ).toBeVisible();
    });

    // AUTH.F5 – Register username chars
    test("AUTH.F5 – Register username chars", async ({ page }) => {
      await page.goto("/register");
      await page.getByLabel("Username").pressSequentially("test!");
      await expect(
        page.getByRole("alert").filter({ hasText: /only letters and numbers/ }),
      ).toBeVisible();
    });

    // AUTH.F6 – Register email invalid
    test("AUTH.F6 – Register email invalid", async ({ page }) => {
      await page.goto("/register");
      await page.getByLabel("Email").pressSequentially("invalid-email");
      await expect(
        page.getByRole("alert").filter({ hasText: /valid email/ }),
      ).toBeVisible();
    });

    // AUTH.F7 – Register password short
    // NOTE: code checks length < 8 but i18n says "at least 6 characters"
    test("AUTH.F7 – Register password short", async ({ page }) => {
      await page.goto("/register");
      await page.getByLabel("Password", { exact: true }).pressSequentially("short");
      await expect(
        page.getByRole("alert").filter({ hasText: /at least 6 characters/ }),
      ).toBeVisible();
    });

    // AUTH.F8 – Register password mismatch
    test("AUTH.F8 – Register password mismatch", async ({ page }) => {
      await page.goto("/register");
      await page.getByLabel("Password", { exact: true }).pressSequentially("password123");
      await page.getByLabel("Confirm Password").pressSequentially("different123");
      await expect(
        page.getByRole("alert").filter({ hasText: /Passwords do not match/ }),
      ).toBeVisible();
    });

    // AUTH.F9 – Register name required
    test("AUTH.F9 – Register name required", async ({ page }) => {
      await page.goto("/register");
      const field = page.getByLabel("Full Name");
      await field.pressSequentially("Test");
      await field.fill("");
      await expect(
        page.getByRole("alert").filter({ hasText: /Name is required/ }),
      ).toBeVisible();
    });

    // AUTH.F10-F12 — SKIPPED
    // age/weight/height have no inline validators in the register form.
    // Bounds exist only in the Zod schema, not the UI. Would require
    // server-side validation testing, not client-side E2E.
  });
});

