import { test, expect } from '@playwright/test'
import path from 'path'

const AUTH_DIR = path.join(__dirname, '.auth')
const storageStateFor = (role: 'super_admin' | 'admin' | 'viewer') =>
  path.join(AUTH_DIR, `${role}.json`)

test.describe('settings/users — super_admin only route', () => {
  test('super_admin can open /settings/users', async ({ browser }) => {
    const context = await browser.newContext({ storageState: storageStateFor('super_admin') })
    const page = await context.newPage()
    await page.goto('/settings/users')
    await expect(page).toHaveURL(/\/settings\/users/)
    await context.close()
  })

  for (const role of ['admin', 'viewer'] as const) {
    test(`${role} is redirected away from /settings/users to /dashboard`, async ({ browser }) => {
      const context = await browser.newContext({ storageState: storageStateFor(role) })
      const page = await context.newPage()
      await page.goto('/settings/users')
      await expect(page).toHaveURL(/\/dashboard/)
      await context.close()
    })
  }
})

test.describe('settings/pricing — admin+ route (viewer blocked)', () => {
  for (const role of ['super_admin', 'admin'] as const) {
    test(`${role} can open /settings/pricing`, async ({ browser }) => {
      const context = await browser.newContext({ storageState: storageStateFor(role) })
      const page = await context.newPage()
      await page.goto('/settings/pricing')
      await expect(page).toHaveURL(/\/settings\/pricing/)
      await context.close()
    })
  }

  test('viewer is redirected away from /settings/pricing to /dashboard', async ({ browser }) => {
    const context = await browser.newContext({ storageState: storageStateFor('viewer') })
    const page = await context.newPage()
    await page.goto('/settings/pricing')
    await expect(page).toHaveURL(/\/dashboard/)
    await context.close()
  })
})

test.describe('fleet/vehicles/new — write route (viewer blocked)', () => {
  for (const role of ['super_admin', 'admin'] as const) {
    test(`${role} can open /fleet/vehicles/new`, async ({ browser }) => {
      const context = await browser.newContext({ storageState: storageStateFor(role) })
      const page = await context.newPage()
      await page.goto('/fleet/vehicles/new')
      await expect(page).toHaveURL(/\/fleet\/vehicles\/new/)
      await context.close()
    })
  }

  test('viewer is redirected away from /fleet/vehicles/new to /dashboard', async ({ browser }) => {
    const context = await browser.newContext({ storageState: storageStateFor('viewer') })
    const page = await context.newPage()
    await page.goto('/fleet/vehicles/new')
    await expect(page).toHaveURL(/\/dashboard/)
    await context.close()
  })
})

test.describe('vehicle list — "Add Vehicle" button visibility', () => {
  test('super_admin and admin see the Add Vehicle link', async ({ browser }) => {
    for (const role of ['super_admin', 'admin'] as const) {
      const context = await browser.newContext({ storageState: storageStateFor(role) })
      const page = await context.newPage()
      await page.goto('/fleet/vehicles')
      await expect(page.locator('a[href="/fleet/vehicles/new"]')).toBeVisible()
      await context.close()
    }
  })

  test('viewer does not see the Add Vehicle link', async ({ browser }) => {
    const context = await browser.newContext({ storageState: storageStateFor('viewer') })
    const page = await context.newPage()
    await page.goto('/fleet/vehicles')
    await expect(page.locator('a[href="/fleet/vehicles/new"]')).toHaveCount(0)
    await context.close()
  })
})
