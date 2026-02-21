import { test, expect } from '@playwright/test'

test.describe('Comments Flow', () => {
  const trainerEmail = 'trainer@example.com'
  const trainerPassword = 'password123'
  const athleteEmail = 'athlete@example.com'
  const athletePassword = 'password123'

  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('athlete can comment on own workout', async ({ page }) => {
    // Login as athlete
    await page.fill('[data-testid="email-input"]', athleteEmail)
    await page.fill('[data-testid="password-input"]', athletePassword)
    await page.click('[data-testid="login-button"]')
    await page.waitForURL(/.*dashboard/)

    // Navigate to workouts
    await page.click('text=Workouts')
    await page.waitForURL(/.*workouts/)

    // Click on a workout to view details
    await page.click('.workout-item >> nth=0')

    // Add comment
    await page.fill('[data-testid="comment-input"]', 'Great workout today!')
    await page.click('[data-testid="comment-submit-button"]')

    // Verify comment appears
    await expect(page.locator('text=Great workout today!')).toBeVisible()
  })

  test('trainer can comment on client workout', async ({ page }) => {
    // Login as trainer
    await page.fill('[data-testid="email-input"]', trainerEmail)
    await page.fill('[data-testid="password-input"]', trainerPassword)
    await page.click('[data-testid="login-button"]')
    await page.waitForURL(/.*dashboard/)

    // Navigate to clients
    await page.click('text=Clients')
    await page.waitForURL(/.*clients/)

    // Select a client
    await page.click('[data-testid="client-item"] >> nth=0')

    // Navigate to client's workouts
    await page.click('text=Workouts')

    // Click on a workout
    await page.click('.workout-item >> nth=0')

    // Add comment
    await page.fill('[data-testid="comment-input"]', 'Keep up the good form!')
    await page.click('[data-testid="comment-submit-button"]')

    // Verify comment appears
    await expect(page.locator('text=Keep up the good form!')).toBeVisible()
  })

  test('threaded reply appears indented', async ({ page }) => {
    // Login as athlete
    await page.fill('[data-testid="email-input"]', athleteEmail)
    await page.fill('[data-testid="password-input"]', athletePassword)
    await page.click('[data-testid="login-button"]')
    await page.waitForURL(/.*dashboard/)

    // Navigate to workouts
    await page.click('text=Workouts')
    await page.click('.workout-item >> nth=0')

    // Add root comment
    await page.fill('[data-testid="comment-input"]', 'Root comment')
    await page.click('[data-testid="comment-submit-button"]')

    // Click reply on the comment
    await page.click('[data-testid="reply-button"] >> nth=0')

    // Add reply
    await page.fill('[data-testid="reply-input"]', 'This is a reply')
    await page.click('[data-testid="reply-submit-button"]')

    // Verify reply is visible and indented
    await expect(page.locator('text=This is a reply')).toBeVisible()
    const replyElement = page.locator('[data-testid="comment-item"] >> nth=1')
    await expect(replyElement).toHaveClass(/ml-6/)
  })

  test('edit comment updates content', async ({ page }) => {
    // Login as athlete
    await page.fill('[data-testid="email-input"]', athleteEmail)
    await page.fill('[data-testid="password-input"]', athletePassword)
    await page.click('[data-testid="login-button"]')
    await page.waitForURL(/.*dashboard/)

    // Navigate to workouts
    await page.click('text=Workouts')
    await page.click('.workout-item >> nth=0')

    // Add comment
    await page.fill('[data-testid="comment-input"]', 'Original content')
    await page.click('[data-testid="comment-submit-button"]')

    // Click edit button
    await page.click('[data-testid="edit-button"] >> nth=0')

    // Edit content
    await page.fill('[data-testid="edit-textarea"]', 'Updated content')
    await page.click('[data-testid="save-button"]')

    // Verify updated content appears
    await expect(page.locator('text=Updated content')).toBeVisible()

    // Verify edited badge appears
    await expect(page.locator('text=(edited)')).toBeVisible()
  })

  test('delete comment removes it', async ({ page }) => {
    // Login as athlete
    await page.fill('[data-testid="email-input"]', athleteEmail)
    await page.fill('[data-testid="password-input"]', athletePassword)
    await page.click('[data-testid="login-button"]')
    await page.waitForURL(/.*dashboard/)

    // Navigate to workouts
    await page.click('text=Workouts')
    await page.click('.workout-item >> nth=0')

    // Add comment
    await page.fill('[data-testid="comment-input"]', 'To be deleted')
    await page.click('[data-testid="comment-submit-button"]')

    // Verify comment exists
    await expect(page.locator('text=To be deleted')).toBeVisible()

    // Click delete
    page.on('dialog', dialog => dialog.accept())
    await page.click('[data-testid="delete-button"] >> nth=0')

    // Verify comment is removed
    await expect(page.locator('text=To be deleted')).not.toBeVisible()
  })

  test('validation prevents empty comment', async ({ page }) => {
    // Login as athlete
    await page.fill('[data-testid="email-input"]', athleteEmail)
    await page.fill('[data-testid="password-input"]', athletePassword)
    await page.click('[data-testid="login-button"]')
    await page.waitForURL(/.*dashboard/)

    // Navigate to workouts
    await page.click('text=Workouts')
    await page.click('.workout-item >> nth=0')

    // Try to submit empty comment
    await page.click('[data-testid="comment-submit-button"]')

    // Verify error message
    await expect(page.locator('text=Comment cannot be empty')).toBeVisible()
  })

  test('readOnly mode hides action buttons', async ({ page }) => {
    // Login as trainer viewing another trainer's client (not their own)
    await page.fill('[data-testid="email-input"]', trainerEmail)
    await page.fill('[data-testid="password-input"]', trainerPassword)
    await page.click('[data-testid="login-button"]')
    await page.waitForURL(/.*dashboard/)

    // Navigate to workouts (not as client's trainer)
    await page.click('text=Workouts')
    await page.click('.workout-item >> nth=0')

    // Verify no comment form
    await expect(page.locator('[data-testid="comment-input"]')).not.toBeVisible()

    // Verify no edit/delete buttons on existing comments
    await expect(page.locator('[data-testid="edit-button"]')).not.toBeVisible()
    await expect(page.locator('[data-testid="delete-button"]')).not.toBeVisible()
  })

  test('trainer can comment on client meal', async ({ page }) => {
    // Login as trainer
    await page.fill('[data-testid="email-input"]', trainerEmail)
    await page.fill('[data-testid="password-input"]', trainerPassword)
    await page.click('[data-testid="login-button"]')
    await page.waitForURL(/.*dashboard/)

    // Navigate to clients
    await page.click('text=Clients')
    await page.click('[data-testid="client-item"] >> nth=0')

    // Navigate to meals
    await page.click('text=Meals')

    // Click on a meal
    await page.click('.meal-item >> nth=0')

    // Add comment
    await page.fill('[data-testid="comment-input"]', 'Good protein intake!')
    await page.click('[data-testid="comment-submit-button"]')

    // Verify comment appears
    await expect(page.locator('text=Good protein intake!')).toBeVisible()
  })

  test('comment count updates after adding', async ({ page }) => {
    // Login as athlete
    await page.fill('[data-testid="email-input"]', athleteEmail)
    await page.fill('[data-testid="password-input"]', athletePassword)
    await page.click('[data-testid="login-button"]')
    await page.waitForURL(/.*dashboard/)

    // Navigate to workouts
    await page.click('text=Workouts')
    await page.click('.workout-item >> nth=0')

    // Check initial count
    const countElement = page.locator('text=Comments (')
    await expect(countElement).toContainText('Comments (0)')

    // Add comment
    await page.fill('[data-testid="comment-input"]', 'First comment')
    await page.click('[data-testid="comment-submit-button"]')

    // Verify count increased
    await expect(countElement).toContainText('Comments (1)')
  })

  test('athlete cannot comment on other athlete workout', async ({ page }) => {
    // Login as athlete
    await page.fill('[data-testid="email-input"]', athleteEmail)
    await page.fill('[data-testid="password-input"]', athletePassword)
    await page.click('[data-testid="login-button"]')
    await page.waitForURL(/.*dashboard/)

    // Try to navigate to another athlete's workout directly
    await page.goto('/workouts/other-athlete-workout-id')

    // Verify access denied or comment form not visible
    await expect(page.locator('[data-testid="comment-input"]')).not.toBeVisible()
  })
})
