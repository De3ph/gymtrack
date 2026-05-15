import { test } from "@playwright/test";
import { ROUTES } from "@/lib/routes";

test.describe("Login", () => {
  test.beforeEach(async ({ page }) => {
    // Mock API responses to ensure tests pass without a running backend
    await page.route("**/api/auth/login", async (route) => {
      const body = route.request().postDataJSON()
      const role = body?.identifier?.includes("trainer")
        ? "trainer"
        : "athlete"

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          message: "Login successful",
          accessToken: "mock-access-token",
          refreshToken: "mock-refresh-token",
          user: {
            userId: "1",
            username: body?.identifier?.split('@')[0] || "testuser",
            email: body?.identifier || "test@example.com",
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

    // Open login page
    await page.goto(ROUTES.LOGIN);
  });

  // Test ID: 1.1.1 – Successful login with valid credentials (athlete role)
  test("login: athlete redirects to workouts page", async ({ page }) => {
    // Fill valid athlete credentials using pressSequentially for reliability
    // across all browsers with React controlled inputs
    await page.locator("#identifier").pressSequentially("athlete@example.com");
    await page.locator("#password").pressSequentially("Password123");

    // Submit form
    await page.getByRole("button", { name: /login|submit/i }).click();

    // Expect redirection to athlete workouts page
    await page.waitForURL(ROUTES.ATHLETE_WORKOUTS);
  });
});
