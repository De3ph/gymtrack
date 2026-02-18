import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should register new user successfully', async ({ page }) => {
    // Navigate to registration page
    await page.click('text=Sign up')
    
    // Fill registration form
    await page.fill('[data-testid="email-input"]', 'newuser@example.com')
    await page.fill('[data-testid="password-input"]', 'password123')
    await page.selectOption('[data-testid="role-select"]', 'athlete')
    await page.fill('[data-testid="name-input"]', 'New User')
    await page.fill('[data-testid="age-input"]', '25')
    await page.fill('[data-testid="weight-input"]', '70')
    await page.fill('[data-testid="height-input"]', '175')
    
    // Submit form
    await page.click('[data-testid="register-button"]')
    
    // Should redirect to login or dashboard
    await expect(page).toHaveURL(/.*login|dashboard/)
  })

  test('should login with valid credentials', async ({ page }) => {
    // Navigate to login page
    await page.click('text=Login')
    
    // Fill login form
    await page.fill('[data-testid="email-input"]', 'test@example.com')
    await page.fill('[data-testid="password-input"]', 'password123')
    
    // Submit form
    await page.click('[data-testid="login-button"]')
    
    // Should redirect to dashboard
    await expect(page).toHaveURL(/.*dashboard/)
  })

  test('should show error for invalid credentials', async ({ page }) => {
    // Navigate to login page
    await page.click('text=Login')
    
    // Fill login form with invalid credentials
    await page.fill('[data-testid="email-input"]', 'invalid@example.com')
    await page.fill('[data-testid="password-input"]', 'wrongpassword')
    
    // Submit form
    await page.click('[data-testid="login-button"]')
    
    // Should show error message
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible()
    await expect(page.locator('text=Invalid credentials')).toBeVisible()
  })

  test('should logout successfully', async ({ page }) => {
    // First login
    await page.click('text=Login')
    await page.fill('[data-testid="email-input"]', 'test@example.com')
    await page.fill('[data-testid="password-input"]', 'password123')
    await page.click('[data-testid="login-button"]')
    await page.waitForURL(/.*dashboard/)
    
    // Then logout
    await page.click('[data-testid="logout-button"]')
    
    // Should redirect to login page
    await expect(page).toHaveURL(/.*login/)
  })
})
