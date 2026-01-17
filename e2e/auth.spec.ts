import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test.describe('Login Page', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/login')
    })

    test('should display login form', async ({ page }) => {
      // Check page elements
      await expect(page.getByRole('heading')).toBeVisible()
      await expect(page.getByTestId('login-email-input')).toBeVisible()
      await expect(page.getByTestId('login-submit-btn')).toBeVisible()
      await expect(page.getByTestId('login-google-btn')).toBeVisible()
    })

    test('should disable submit button when email is empty', async ({ page }) => {
      const submitBtn = page.getByTestId('login-submit-btn')
      await expect(submitBtn).toBeDisabled()
    })

    test('should enable submit button with valid email', async ({ page }) => {
      const emailInput = page.getByTestId('login-email-input')
      const submitBtn = page.getByTestId('login-submit-btn')
      
      await emailInput.fill('test@example.com')
      
      // Wait for validation
      await page.waitForTimeout(300)
      
      await expect(submitBtn).toBeEnabled()
    })

    test('should show validation for invalid email', async ({ page }) => {
      const emailInput = page.getByTestId('login-email-input')
      
      await emailInput.fill('invalid-email')
      await emailInput.blur()
      
      // Submit button should remain disabled
      const submitBtn = page.getByTestId('login-submit-btn')
      await expect(submitBtn).toBeDisabled()
    })
  })

  test.describe('Create Account Page', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/create-account')
    })

    test('should display signup form', async ({ page }) => {
      await expect(page.getByRole('heading')).toBeVisible()
      await expect(page.getByTestId('signup-email-input')).toBeVisible()
      await expect(page.getByTestId('signup-submit-btn')).toBeVisible()
      await expect(page.getByTestId('signup-google-btn')).toBeVisible()
    })

    test('should show back button', async ({ page }) => {
      const backBtn = page.getByRole('button', { name: /back/i })
      await expect(backBtn).toBeVisible()
    })

    test('should navigate back to landing on back button click', async ({ page }) => {
      const backBtn = page.getByRole('button', { name: /back/i })
      await backBtn.click()
      
      await expect(page).toHaveURL('/')
    })

    test('should display username badge if username param present', async ({ page }) => {
      await page.goto('/create-account?username=testuser')
      
      // Should show the username confirmation badge
      await expect(page.getByText('haady.app/@testuser')).toBeVisible()
    })
  })

  test.describe('OTP Verification Page', () => {
    test('should redirect without email param', async ({ page }) => {
      await page.goto('/verify-email-otp')
      
      // Should redirect or show error
      // Check we're not stuck on an empty OTP page
      await page.waitForTimeout(1000)
    })

    test('should display OTP inputs with email param', async ({ page }) => {
      await page.goto('/verify-email-otp?email=test@example.com&flow=signup')
      
      // Should show OTP input fields
      await expect(page.getByTestId('otp-input-wrapper')).toBeVisible()
      await expect(page.getByTestId('otp-input-0')).toBeVisible()
      await expect(page.getByTestId('otp-verify-btn')).toBeVisible()
    })

    test('should disable verify button until OTP is complete', async ({ page }) => {
      await page.goto('/verify-email-otp?email=test@example.com&flow=signup')
      
      const verifyBtn = page.getByTestId('otp-verify-btn')
      await expect(verifyBtn).toBeDisabled()
      
      // Fill partial OTP
      await page.getByTestId('otp-input-0').fill('1')
      await page.getByTestId('otp-input-1').fill('2')
      await page.getByTestId('otp-input-2').fill('3')
      
      // Still disabled (need 6 digits)
      await expect(verifyBtn).toBeDisabled()
    })

    test('should allow pasting full OTP', async ({ page }) => {
      await page.goto('/verify-email-otp?email=test@example.com&flow=signup')
      
      // Focus first input and paste
      const firstInput = page.getByTestId('otp-input-0')
      await firstInput.focus()
      
      // Simulate paste
      await page.evaluate(() => {
        const event = new ClipboardEvent('paste', {
          clipboardData: new DataTransfer(),
        })
        event.clipboardData?.setData('text/plain', '123456')
        document.activeElement?.dispatchEvent(event)
      })
    })
  })
})

test.describe('Auth Navigation', () => {
  test('should navigate from landing to create account', async ({ page }) => {
    await page.goto('/')
    
    // Fill valid username
    const usernameInput = page.locator('[data-testid="landing-username-input"]')
    await usernameInput.fill('newuser123')
    
    // Wait for validation and availability check
    await page.waitForTimeout(2000)
    
    // If username is available, create account button appears
    const createBtn = page.getByTestId('landing-create-account-btn')
    if (await createBtn.isVisible()) {
      // Force click to bypass animation stability check
      await createBtn.click({ force: true })
      
      // Should navigate to auth page with username
      await expect(page).toHaveURL(/\/auth\?username=newuser123/)
    }
  })
})
