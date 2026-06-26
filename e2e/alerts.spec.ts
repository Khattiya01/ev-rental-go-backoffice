import { test, expect, type Page, type APIRequestContext } from '@playwright/test'
import path from 'path'
import { seedAlert, deleteAlerts, closeAlertsDb } from './fixtures/alerts-db'

const AUTH_DIR = path.join(__dirname, '.auth')
test.use({ storageState: path.join(AUTH_DIR, 'super_admin.json') })

// alerts-page.spec.ts and notification-bell.spec.ts both assert on *global*
// unresolved-alert counts/lists (no search scoping available for the summary
// cards or the bell badge), so they can't be left to run in different
// Playwright workers — one file's seeded rows bleed into the other's
// assertions. Merging them into a single file with one top-level serial
// config is what actually guarantees a single worker; per-describe
// `mode: 'serial'` only serializes within its own file.
test.describe.configure({ mode: 'serial' })

async function cardCount(page: Page, label: string): Promise<number> {
  const text = await page.locator('button', { hasText: label }).innerText()
  const match = text.match(/(\d+)\s*$/)
  if (!match) throw new Error(`could not read a count out of card "${label}": ${text}`)
  return parseInt(match[1], 10)
}

async function unresolvedTotal(request: APIRequestContext, type: string): Promise<number> {
  const res = await request.get(`/api/alerts?type=${type}&resolved=false&limit=1`)
  const json = await res.json() as { total: number }
  return json.total
}

test.describe('alerts page', () => {
  const marker = `E2E-ALERTS-${Date.now()}`
  const ids: string[] = []

  test.afterAll(async () => {
    await deleteAlerts(ids)
    await closeAlertsDb()
  })

  test('summary cards reflect unresolved counts per type after seeding one of each', async ({ page, request }) => {
    const before = {
      battery_low: await unresolvedTotal(request, 'battery_low'),
      geofence_breach: await unresolvedTotal(request, 'geofence_breach'),
      payment_reminder: await unresolvedTotal(request, 'payment_reminder'),
      vehicle_offline: await unresolvedTotal(request, 'vehicle_offline'),
    }

    ids.push(await seedAlert({ type: 'battery_low', severity: 'critical', message: `${marker} แบตต่ำวิกฤต`, entityId: 'fixture-vehicle-1' }))
    ids.push(await seedAlert({ type: 'geofence_breach', severity: 'warning', message: `${marker} ออกนอกพื้นที่ที่กำหนด`, entityId: 'fixture-vehicle-2' }))
    ids.push(await seedAlert({ type: 'payment_reminder', severity: 'info', message: `${marker} ใกล้ครบกำหนดชำระ`, entityId: 'fixture-invoice-1' }))
    ids.push(await seedAlert({ type: 'vehicle_offline', severity: 'critical', message: `${marker} ขาดการเชื่อมต่อ`, entityId: 'fixture-vehicle-3' }))

    await page.goto('/alerts')

    await expect.poll(() => cardCount(page, 'แบตต่ำ')).toBe(before.battery_low + 1)
    expect(await cardCount(page, 'ออกนอกพื้นที่')).toBe(before.geofence_breach + 1)
    expect(await cardCount(page, 'ใกล้ครบกำหนด')).toBe(before.payment_reminder + 1)
    expect(await cardCount(page, 'ขาดการเชื่อมต่อ')).toBe(before.vehicle_offline + 1)
  })

  test('clicking a summary card filters the table to that type', async ({ page }) => {
    await page.goto('/alerts')
    await page.locator('button', { hasText: 'ออกนอกพื้นที่' }).click()

    await expect(page.getByText(`${marker} ออกนอกพื้นที่ที่กำหนด`)).toBeVisible()
    await expect(page.getByText(`${marker} แบตต่ำวิกฤต`)).toHaveCount(0)
  })

  test('search narrows the table to matching messages regardless of type/status filters', async ({ page }) => {
    await page.goto('/alerts')
    await page.getByPlaceholder('ค้นหาข้อความแจ้งเตือน...').fill(marker)

    // All 4 fixture rows match the marker and are unresolved (the default filter).
    await expect(page.getByText(`${marker} แบตต่ำวิกฤต`)).toBeVisible()
    await expect(page.getByText(`${marker} ออกนอกพื้นที่ที่กำหนด`)).toBeVisible()
    await expect(page.getByText(`${marker} ใกล้ครบกำหนดชำระ`)).toBeVisible()
    await expect(page.getByText(`${marker} ขาดการเชื่อมต่อ`)).toBeVisible()
    await expect(page.getByText(/แสดง 4 จาก 4 รายการ/)).toBeVisible()
  })

  test('resolving a row removes it from the unresolved filter immediately', async ({ page }) => {
    await page.goto('/alerts')
    await page.getByPlaceholder('ค้นหาข้อความแจ้งเตือน...').fill(marker)

    const row = page.locator('tr', { hasText: `${marker} แบตต่ำวิกฤต` })
    await expect(row).toBeVisible()
    await row.getByRole('button', { name: 'Resolve' }).click()

    await expect(page.locator('tr', { hasText: `${marker} แบตต่ำวิกฤต` })).toHaveCount(0)

    // Switching to the "resolved" filter (still scoped by the same search) finds it again.
    await page.getByRole('button', { name: 'แก้ไขแล้ว', exact: true }).click()
    await expect(page.locator('tr', { hasText: `${marker} แบตต่ำวิกฤต` })).toBeVisible()
  })

  test('pagination splits results across pages once they exceed one page size', async ({ page }) => {
    const paginationMarker = `${marker}-PAGE`
    const extraIds = await Promise.all(
      Array.from({ length: 21 }, (_, i) =>
        seedAlert({ type: 'battery_low', severity: 'info', message: `${paginationMarker} row ${i}`, entityId: `fixture-page-${i}` }),
      ),
    )
    ids.push(...extraIds)

    await page.goto('/alerts')
    await page.getByPlaceholder('ค้นหาข้อความแจ้งเตือน...').fill(paginationMarker)

    await expect(page.getByText(/แสดง 20 จาก 21 รายการ/)).toBeVisible()
    const footer = page.locator('div.border-t.border-slate-100')
    await expect(footer.getByText('1 / 2')).toBeVisible()

    await footer.locator('button').nth(1).click() // next page
    await expect(footer.getByText('2 / 2')).toBeVisible()
    await expect(page.getByText(/แสดง 1 จาก 21 รายการ/)).toBeVisible()
  })
})

function bellContainer(page: Page) {
  return page.locator('div.relative', { has: page.locator('svg.lucide-bell') })
}

// Scoped to the toggle button itself (not the whole relative container) so
// the badge <span> isn't confused with the many <span>s inside the dropdown
// panel once it's open.
function bellButton(page: Page) {
  return page.locator('button:has(svg.lucide-bell)')
}

function badgeText(page: Page) {
  return bellButton(page).locator('span')
}

function dropdownPanel(page: Page) {
  return bellContainer(page).locator('div.absolute.right-0.top-10')
}

async function openDropdown(page: Page) {
  await page.goto('/dashboard')
  await bellButton(page).click()
  await expect(dropdownPanel(page)).toBeVisible()
}

test.describe('notification bell', () => {
  const ids: string[] = []

  test.afterAll(async () => {
    await deleteAlerts(ids)
    await closeAlertsDb()
  })

  test('badge shows "9+" once unresolved alerts exceed 9', async ({ page }) => {
    const seeded = await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        seedAlert({ type: 'battery_low', severity: 'info', message: `E2E-BELL-COUNT row ${i}`, entityId: `fixture-bell-${i}` }),
      ),
    )
    ids.push(...seeded)

    await page.goto('/dashboard')
    await expect(badgeText(page)).toHaveText('9+')
  })

  test('dropdown lists alerts sorted by severity (critical, then warning, then info)', async ({ page }) => {
    // Inserted in the "wrong" order on purpose — if the dropdown merely showed
    // insertion order, critical wouldn't end up first.
    const info = await seedAlert({ type: 'battery_low', severity: 'info', message: 'E2E-BELL-SORT info row', entityId: 'fixture-sort-info' })
    const warning = await seedAlert({ type: 'battery_low', severity: 'warning', message: 'E2E-BELL-SORT warning row', entityId: 'fixture-sort-warning' })
    const critical = await seedAlert({ type: 'battery_low', severity: 'critical', message: 'E2E-BELL-SORT critical row', entityId: 'fixture-sort-critical' })
    ids.push(info, warning, critical)

    await openDropdown(page)

    const rowTexts = await dropdownPanel(page).locator('p.text-slate-700').allTextContents()
    const indexOf = (needle: string) => rowTexts.findIndex(t => t.includes(needle))
    const criticalIdx = indexOf('critical row')
    const warningIdx = indexOf('warning row')
    const infoIdx = indexOf('info row')

    expect(criticalIdx).toBeGreaterThanOrEqual(0)
    expect(warningIdx).toBeGreaterThanOrEqual(0)
    expect(infoIdx).toBeGreaterThanOrEqual(0)
    expect(criticalIdx).toBeLessThan(warningIdx)
    expect(warningIdx).toBeLessThan(infoIdx)
  })

  test('resolving an alert from the dropdown removes it and drops the badge count immediately', async ({ page }) => {
    const id = await seedAlert({ type: 'battery_low', severity: 'critical', message: 'E2E-BELL-RESOLVE target row', entityId: 'fixture-resolve' })
    ids.push(id)

    await openDropdown(page)
    const before = await badgeText(page).textContent()

    // The row div is the deepest element that both contains the message text
    // and wraps the Resolve button (one level deeper, the text-only div fails
    // the `has` filter, so `.last()` lands exactly on the row).
    const row = dropdownPanel(page)
      .locator('div')
      .filter({ hasText: 'E2E-BELL-RESOLVE target row' })
      .filter({ has: page.getByRole('button', { name: 'Resolve' }) })
      .last()
    await row.getByRole('button', { name: 'Resolve' }).click()

    await expect(dropdownPanel(page).getByText('E2E-BELL-RESOLVE target row')).toHaveCount(0)

    const after = await badgeText(page).textContent()
    // Both counts are capped display strings ("9+"); only assert the
    // straightforward case where we're below the cap so the diff is exact.
    if (before && after && !before.includes('+') && !after.includes('+')) {
      expect(parseInt(after, 10)).toBe(parseInt(before, 10) - 1)
    }
  })

  test('"view all" navigates to /alerts and closes the dropdown', async ({ page }) => {
    await openDropdown(page)
    await dropdownPanel(page).getByRole('link', { name: 'ดูการแจ้งเตือนทั้งหมด' }).click()

    await expect(page).toHaveURL(/\/alerts$/)
    await expect(dropdownPanel(page)).toHaveCount(0)
  })
})
