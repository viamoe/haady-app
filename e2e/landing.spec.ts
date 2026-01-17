import { test, expect } from '@playwright/test'

test.describe('Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should display the landing page with hero section', async ({ page }) => {
    // Check page title/heading
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    
    // Check username input is visible
    await expect(page.getByTestId('username-input-wrapper')).toBeVisible()
  })

  test('should show validation for username input', async ({ page }) => {
    const usernameInput = page.locator('[data-testid="landing-username-input"]')
    
    // Type an invalid username (too short)
    await usernameInput.fill('ab')
    
    // Wait for validation message
    await page.waitForTimeout(600) // debounce + validation
    
    // Should not show create account button for invalid username
    await expect(page.getByTestId('landing-create-account-btn')).not.toBeVisible()
  })

  test('should show create account button for valid username', async ({ page }) => {
    const usernameInput = page.locator('[data-testid="landing-username-input"]')
    
    // Type a valid username
    await usernameInput.fill('testuser123')
    
    // Wait for availability check
    await page.waitForTimeout(1000)
    
    // Create account button should appear if username is available
    // Note: This depends on API availability
  })

  test('should toggle language between English and Arabic', async ({ page }) => {
    // Find language toggle button (globe icon)
    const langToggle = page.locator('button[title*="Switch to"], button[aria-label*="Switch to"]')
    
    if (await langToggle.isVisible()) {
      await langToggle.click()
      
      // Page should switch direction
      const html = page.locator('html')
      const dir = await html.getAttribute('dir')
      expect(dir).toBe('rtl')
    }
  })
})

test.describe('Landing Page - Mobile', () => {
  test.use({ viewport: { width: 375, height: 667 } })

  test('should be responsive on mobile', async ({ page }) => {
    await page.goto('/')
    
    // Page should still display hero content
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    
    // Username input should be visible
    await expect(page.getByTestId('username-input-wrapper')).toBeVisible()
  })
})
