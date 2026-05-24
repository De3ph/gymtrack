import { test, expect } from "@playwright/test";
import { ROUTES } from "@/lib/routes";

test.describe("Navigation", () => {
  // Test ID: 1.3.1 – Click "Sign up" link on login page
  test("navigation: sign up link navigates to register page", async ({ page }) => {
    // Navigate to login page
    await page.goto(ROUTES.LOGIN);

    // Click the "Sign up" link
    await page.getByRole("link", { name: /sign up|register/i }).click();

    // Expect navigation to register page
    await page.waitForURL(/\/register/);
    await expect(page).toHaveURL(/\/register/);
  });

  // Test ID: 1.3.2 – Click "Login" link on register page
  test("navigation: login link navigates to login page", async ({ page }) => {
    // Navigate to register page
    await page.goto(ROUTES.REGISTER);

    // Click the "Login" link
    await page.getByRole("link", { name: /login|sign in/i }).click();

    // Expect navigation to login page
    await page.waitForURL(/\/login/);
    await expect(page).toHaveURL(/\/login/);
  });
});
