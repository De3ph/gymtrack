import { test, expect } from "@playwright/test";
import { ROUTES } from "@/lib/routes";

test.describe("Registration", () => {
  test.beforeEach(async ({ page }) => {
    // Mock API responses
    await page.route(/\/auth\/register/, async (route) => {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          message: "User registered successfully",
          user: { id: "1", username: "testuser" },
        }),
      });
    });

    await page.route(/\/auth\/login/, async (route) => {
      const body = route.request().postDataJSON();
      const role = body?.identifier?.includes("trainer")
        ? "trainer"
        : "athlete";

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          accessToken: "mock-access-token",
          refreshToken: "mock-refresh-token",
          user: {
            id: "1",
            username: "testuser",
            email: body?.identifier || "test@example.com",
            role,
          },
        }),
      });
    });

    // Navigate to the registration page
    await page.goto(ROUTES.REGISTER);
  });

  // 1.2.1 Registration: Register new athlete with all required fields
  test("register: athlete successful registration", async ({ page }) => {
    const uniqueId = Date.now();
    const username = `athlete${uniqueId}`;
    const email = `athlete${uniqueId}@example.com`;

    await page.locator("#username").pressSequentially(username);
    await page.locator("#email").pressSequentially(email);
    await page.locator("#password").pressSequentially("Password123");
    await page.locator("#confirmPassword").pressSequentially("Password123");
    await page.locator("#name").pressSequentially("Test Athlete");
    await page.locator("#age").pressSequentially("25");
    await page.locator("#weight").pressSequentially("75");
    await page.locator("#height").pressSequentially("180");
    await page.locator("#fitnessGoals").pressSequentially("Build muscle and improve endurance");

    await page.getByRole("button", { name: /create account|submit/i }).click();
    await page.waitForURL(/\/$/);
    await expect(page).toHaveURL(/\/$/);
  });

  // 1.2.2 Registration: Register new trainer with all required fields
  test("register: trainer successful registration", async ({ page }) => {
    const uniqueId = Date.now();
    const username = `trainer${uniqueId}`;
    const email = `trainer${uniqueId}@example.com`;

    await page.locator("#username").pressSequentially(username);
    await page.locator("#email").pressSequentially(email);
    await page.locator("#password").pressSequentially("Password123");
    await page.locator("#confirmPassword").pressSequentially("Password123");
    await page.locator("#name").pressSequentially("Test Trainer");

    // Select Trainer role - click the trainer span
    await page.locator("span:text('Trainer')").click();

    await page.locator("#certifications").pressSequentially("NASM CPT, Precision Nutrition");
    await page.locator("#specializations").pressSequentially("Weightlifting, HIIT");

    await page.getByRole("button", { name: /create account|submit/i }).click();
    await page.waitForURL(/\/$/);
    await expect(page).toHaveURL(/\/$/);
  });

  // 1.2.3 Registration: Registration with mismatched passwords
  test("register: mismatched passwords shows error", async ({ page }) => {
    await page.locator("#password").pressSequentially("Password123");
    await page.locator("#confirmPassword").pressSequentially("Password456");

    // Trigger validation by blurring confirm password
    await page.locator("#confirmPassword").blur();

    await expect(page.getByText("Passwords do not match")).toBeVisible();
  });

  // 1.2.4 Registration: Registration with invalid email format
  test("register: invalid email format shows error", async ({ page }) => {
    await page.locator("#email").pressSequentially("not-an-email");

    // Trigger validation by blurring email
    await page.locator("#email").blur();

    await expect(page.getByText("Please enter a valid email")).toBeVisible();
  });

  // 1.2.5 Registration: Registration with short password (<6 chars)
  test("register: short password shows error", async ({ page }) => {
    await page.locator("#password").pressSequentially("12345");

    // Trigger validation by blurring password
    await page.locator("#password").blur();

    await expect(
      page.getByText("Password must be at least 6 characters"),
    ).toBeVisible();
  });

  // 1.2.6 Registration: Role selection (Athlete) shows athlete-specific fields
  test("register: role selection athlete visibility", async ({ page }) => {
    // Athlete role is default, no need to click
    // Wait for component to render

    // Athlete fields should be visible
    await expect(page.locator("#age")).toBeVisible();
    await expect(page.locator("#weight")).toBeVisible();
    await expect(page.locator("#height")).toBeVisible();
    await expect(page.locator("#fitnessGoals")).toBeVisible();

    // Trainer fields should NOT be visible
    await expect(page.locator("#certifications")).not.toBeVisible();
    await expect(page.locator("#specializations")).not.toBeVisible();
  });

  // 1.2.7 Registration: Role selection (Trainer) shows trainer-specific fields
  test("register: role selection trainer visibility", async ({ page }) => {
    // Select Trainer role - click the trainer span
    await page.locator("span:text('Trainer')").click();

    // Trainer fields should be visible
    await expect(page.locator("#certifications")).toBeVisible();
    await expect(page.locator("#specializations")).toBeVisible();

    // Athlete fields should NOT be visible
    await expect(page.locator("#age")).not.toBeVisible();
    await expect(page.locator("#weight")).not.toBeVisible();
    await expect(page.locator("#height")).not.toBeVisible();
    await expect(page.locator("#fitnessGoals")).not.toBeVisible();
  });
});