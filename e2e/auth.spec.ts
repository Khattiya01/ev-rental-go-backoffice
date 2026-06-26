import { test, expect } from '@playwright/test'

// No storageState override here — these specs intentionally run unauthenticated
// (the 'chromium' project's default context has no cookies) to exercise the login
// flow and middleware redirects themselves.

test.describe('login', () => {
  test('shows an error and stays on /login for a wrong password', async ({ page }) => {
    await page.goto('/login')
    await page.locator('input[name="email"]').fill('admin@evrentalgo.com')
    await page.locator('input[name="password"]').fill('wrong-password')
    await page.locator('button[type="submit"]').click()

    await expect(page.getByText('Invalid email or password')).toBeVisible()
    await expect(page).toHaveURL(/\/login/)
  })

  for (const [role, email] of Object.entries({
    super_admin: 'admin@evrentalgo.com',
    admin: 'fleet@evrentalgo.com',
    viewer: 'viewer@evrentalgo.com',
  })) {
    test(`logs in as seeded ${role} and lands on /dashboard`, async ({ page }) => {
      await page.goto('/login')
      await page.locator('input[name="email"]').fill(email)
      await page.locator('input[name="password"]').fill('admin1234')
      await page.locator('button[type="submit"]').click()

      await expect(page).toHaveURL(/\/dashboard/)
    })
  }
})

test.describe('route protection', () => {
  test('redirects an unauthenticated visitor from a protected page to /login', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/)
  })

  test('logging out clears the session and protected pages redirect to /login again', async ({ page }) => {
    await page.goto('/login')
    await page.locator('input[name="email"]').fill('admin@evrentalgo.com')
    await page.locator('input[name="password"]').fill('admin1234')
    await page.locator('button[type="submit"]').click()
    await expect(page).toHaveURL(/\/dashboard/)

    // Open the profile dropdown (button's accessible name includes the seeded user's name)
    // and submit the sign-out form. Text is locale-dependent (th/en), so match both.
    await page.getByRole('button', { name: 'Super Admin' }).click()
    await page.getByRole('button', { name: /Sign Out|ออกจากระบบ/ }).click()

    await expect(page).toHaveURL(/\/login/)
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/)
  })
})
