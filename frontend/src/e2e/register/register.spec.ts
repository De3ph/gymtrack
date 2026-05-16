import { test, expect, type Page } from "@playwright/test";

async function waitForForm(page: Page) {
  await page.waitForFunction('window.__registerForm');
}

async function submitForm(page: Page) {
  await page.evaluate(() => window.__registerForm.handleSubmit());
  await page.waitForTimeout(500);
}

async function setRole(page: Page, role: "athlete" | "trainer") {
  await page.evaluate((r) => window.__registerForm.setFieldValue('role', r), role);
  await page.waitForTimeout(200);
}

test.describe("Registration", () => {
  test.beforeEach(async ({ page }) => {
    // Mock API responses to ensure tests pass without a running backend
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
    await page.goto("/register");
    await waitForForm(page);
  });

  // 1.2.1 Registration: Register new athlete with all required fields
  test("register: athlete successful registration", async ({ page }) => {
    const uniqueId = Date.now();
    const username = `athlete${uniqueId}`;
    const email = `athlete${uniqueId}@example.com`;

    // Fill common fields
    await page.locator("#username").fill(username);
    await page.locator("#email").fill(email);
    await page.locator("#password").fill("Password123");
    await page.locator("#confirmPassword").fill("Password123");
    await page.locator("#name").fill("Test Athlete");

    // Fill athlete-specific fields
    await page.locator("#age").fill("25");
    await page.locator("#weight").fill("75");
    await page.locator("#height").fill("180");
    await page
      .locator("#fitnessGoals")
      .fill("Build muscle and improve endurance");

    // Submit form
    await submitForm(page);

    // Wait for navigation after successful registration
    await page.waitForURL(/\/$/);
    await expect(page).toHaveURL(/\/$/);
  });

  // 1.2.2 Registration: Register new trainer with all required fields
  test("register: trainer successful registration", async ({ page }) => {
    const uniqueId = Date.now();
    const username = `trainer${uniqueId}`;
    const email = `trainer${uniqueId}@example.com`;

    // Fill common fields
    await page.locator("#username").fill(username);
    await page.locator("#email").fill(email);
    await page.locator("#password").fill("Password123");
    await page.locator("#confirmPassword").fill("Password123");
    await page.locator("#name").fill("Test Trainer");

    // Select Trainer role
    await setRole(page, "trainer");

    // Fill trainer-specific fields
    await page.locator("#certifications").fill("NASM CPT, Precision Nutrition");
    await page.locator("#specializations").fill("Weightlifting, HIIT");

    // Submit form
    await submitForm(page);

    // Wait for navigation after successful registration
    await page.waitForURL(/\/$/);
    await expect(page).toHaveURL(/\/$/);
  });

  // 1.2.3 Registration: Registration with mismatched passwords
  test("register: mismatched passwords shows error", async ({ page }) => {
    await expect(page.locator("#password")).toBeVisible();

    await page.locator("#password").fill("Password123");
    await page.locator("#confirmPassword").fill("Password456");

    await submitForm(page);

    await expect(page.getByText("Passwords do not match")).toBeVisible();
  });

  // 1.2.4 Registration: Registration with invalid email format
  test("register: invalid email format shows error", async ({ page }) => {
    await page.locator("#email").fill("not-an-email");

    await submitForm(page);

    await expect(page.getByText("Please enter a valid email")).toBeVisible();
  });

  // 1.2.5 Registration: Registration with short password (<6 chars)
  test("register: short password shows error", async ({ page }) => {
    await page.locator("#password").fill("12345");

    await submitForm(page);

    await expect(
      page.getByText("Password must be at least 6 characters"),
    ).toBeVisible();
  });

  // 1.2.6 Registration: Role selection (Athlete) shows athlete-specific fields
  test("register: role selection athlete visibility", async ({ page }) => {
    // Select Athlete role
    await setRole(page, "athlete");

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
    // Select Trainer role
    await setRole(page, "trainer");

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
