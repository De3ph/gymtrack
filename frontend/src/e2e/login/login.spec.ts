import { test, expect } from "@playwright/test";
import { ROUTES } from "@/lib/routes";

test.describe.serial("Login", () => {
  test.beforeEach(async ({ page }) => {
    // Mock API responses to ensure tests pass without a running backend
    await page.route(/\/api\/auth\/login/, async (route) => {
      const body = route.request().postDataJSON();
      const identifier = body?.identifier || "";
      const password = body?.password || "";
      const role = identifier.includes("trainer") ? "trainer" : "athlete";

      // Handle invalid email format
      if (!identifier.includes("@") || !identifier.includes(".com")) {
        await route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({ message: "Invalid email address" }),
        });
        return;
      }

      // Handle invalid password
      if (password === "wrongpassword") {
        await route.fulfill({
          status: 401,
          contentType: "application/json",
          body: JSON.stringify({ message: "Login failed. Please try again." }),
        });
        return;
      }

      // Successful login
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          message: "Login successful",
          accessToken: "mock-access-token",
          refreshToken: "mock-refresh-token",
          user: {
            userId: "1",
            username: identifier.split("@")[0] || "testuser",
            email: identifier,
            role,
            profile: {
              name: role === "athlete" ? "Test Athlete" : "Test Trainer",
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        }),
      });
    });

    // Mock user API for dashboard layout initialization
    await page.route(/\/api\/users\/me/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          userId: "1",
          username: "testuser",
          email: "test@example.com",
          role: "athlete",
          profile: { name: "Test User" },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      });
    });

    // Open login page
    await page.goto(ROUTES.LOGIN);
  });

  // Test ID: 1.1.1 – Successful login with valid credentials (athlete role)
  test("login: athlete redirects to workouts page", async ({ page }) => {
    await page.locator("#identifier").pressSequentially("athlete@example.com");
    await page.locator("#password").pressSequentially("Password123");
    await page.getByRole("button", { name: /login|submit/i }).click();
    await page.waitForURL(/\/athlete\/workouts/);
  });

  // Test ID: 1.1.2 – Successful login with valid credentials (trainer role)
  test("login: trainer redirects to clients page", async ({ page }) => {
    await page.locator("#identifier").pressSequentially("trainer@example.com");
    await page.locator("#password").pressSequentially("Password123");
    await page.getByRole("button", { name: /login|submit/i }).click();
    await page.waitForURL(/\/trainer\/clients/);
  });

  // Test ID: 1.1.3 – Login with invalid email format
  test("login: invalid email shows error", async ({ page }) => {
    await page.locator("#identifier").pressSequentially("not-an-email");
    await page.locator("#password").pressSequentially("Password123");
    await page.getByRole("button", { name: /login|submit/i }).click();
    await expect(page.getByText("Please enter a valid email or username")).toBeVisible();
  });

  // Test ID: 1.1.4 – Login with invalid password
  test("login: invalid password shows error", async ({ page }) => {
    await page.locator("#identifier").pressSequentially("athlete@example.com");
    await page.locator("#password").pressSequentially("wrongpassword");
    const loginResponse = page.waitForResponse(/\/api\/auth\/login/);
    await page.getByRole("button", { name: /login|submit/i }).click();
    await loginResponse;
    await expect(page.getByText("Login failed. Please try again.")).toBeVisible();
  });

  // Test ID: 1.1.5 – Login with empty email field
  test("login: empty email shows validation error", async ({ page }) => {
    await page.locator("#password").pressSequentially("Password123");
    await page.getByRole("button", { name: /login|submit/i }).click();
    await expect(page.getByText("Email or username is required")).toBeVisible();
  });

  // Test ID: 1.1.6 – Login with empty password field
  test("login: empty password shows validation error", async ({ page }) => {
    await page.locator("#identifier").pressSequentially("athlete@example.com");
    await page.getByRole("button", { name: /login|submit/i }).click();
    await expect(page.getByText("Password is required")).toBeVisible();
  });
});