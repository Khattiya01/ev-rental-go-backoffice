import { test, expect } from '@playwright/test'
import path from 'path'

const AUTH_DIR = path.join(__dirname, '.auth')
const SUPER_ADMIN_PASSWORD = 'admin1234'
// Seeded in db/seed.ts as the vehicle on contract EVR-2024-001 (somchai / teslaY).
const SEEDED_PLATE = 'คง-5678'

test.use({ storageState: path.join(AUTH_DIR, 'super_admin.json') })

async function findVehicleId(request: import('@playwright/test').APIRequestContext): Promise<string> {
  const res = await request.get(`/api/vehicles?search=${encodeURIComponent(SEEDED_PLATE)}`)
  expect(res.ok(), 'vehicle lookup by plate failed').toBeTruthy()
  const { data } = await res.json() as { data: { id: string; plate: string }[] }
  const vehicle = data.find(v => v.plate === SEEDED_PLATE)
  if (!vehicle) throw new Error(`seeded vehicle with plate ${SEEDED_PLATE} not found`)
  return vehicle.id
}

test.describe('vehicle remote control — motor cutoff requires password confirmation', () => {
  let vehicleId: string

  test.beforeAll(async ({ request }) => {
    vehicleId = await findVehicleId(request)
  })

  // Cutoff/restore mutate shared seed state; restore it afterwards so reruns
  // start from the same baseline (motorCutoffActive: false) as a fresh seed.
  test.afterEach(async ({ request }) => {
    await request.post(`/api/vehicles/${vehicleId}/remote`, {
      data: { action: 'restore', password: SUPER_ADMIN_PASSWORD },
    })
  })

  test('cutoff is never a single click — it always opens a password-confirmation modal first', async ({ page }) => {
    await page.goto(`/fleet/vehicles/${vehicleId}`)
    await page.getByRole('button', { name: 'ควบคุมระยะไกล' }).click()
    await page.getByRole('button', { name: 'ตัดพลังงานมอเตอร์' }).click() // 🔒 emoji prefix, so no `exact`

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.getByText('ยืนยันการตัดพลังงานมอเตอร์')).toBeVisible()
    // Confirm is disabled until a password is typed — no accidental single-click cutoff.
    await expect(dialog.getByRole('button', { name: 'ยืนยันและตัดพลังงาน' })).toBeDisabled()
  })

  test('wrong password — request is rejected (401) and the motor stays on', async ({ page }) => {
    await page.goto(`/fleet/vehicles/${vehicleId}`)
    await page.getByRole('button', { name: 'ควบคุมระยะไกล' }).click()
    await page.getByRole('button', { name: 'ตัดพลังงานมอเตอร์' }).click() // 🔒 emoji prefix, so no `exact`

    const dialog = page.getByRole('dialog')
    await dialog.getByPlaceholder('ใส่รหัสผ่านเพื่อยืนยัน').fill('wrong-password')
    await dialog.getByRole('button', { name: 'ยืนยันและตัดพลังงาน' }).click()

    await expect(page.getByText('รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่')).toBeVisible()
    // Modal stays open on failure — the action did not silently succeed.
    await expect(dialog).toBeVisible()
    await expect(page.getByText('พลังงานมอเตอร์ถูกตัดออกอยู่ในขณะนี้')).toHaveCount(0)
  })

  test('correct password — cutoff succeeds and the active-cutoff banner appears', async ({ page }) => {
    await page.goto(`/fleet/vehicles/${vehicleId}`)
    await page.getByRole('button', { name: 'ควบคุมระยะไกล' }).click()
    await page.getByRole('button', { name: 'ตัดพลังงานมอเตอร์' }).click() // 🔒 emoji prefix, so no `exact`

    const dialog = page.getByRole('dialog')
    await dialog.getByPlaceholder('ใส่รหัสผ่านเพื่อยืนยัน').fill(SUPER_ADMIN_PASSWORD)
    await dialog.getByRole('button', { name: 'ยืนยันและตัดพลังงาน' }).click()

    await expect(page.getByText('ตัดพลังงานมอเตอร์สำเร็จ')).toBeVisible()
    await expect(dialog).toBeHidden()
    await expect(page.getByText('พลังงานมอเตอร์ถูกตัดออกอยู่ในขณะนี้')).toBeVisible()

    // Restore also requires a password — re-confirms the symmetric guard.
    await page.getByRole('button', { name: 'คืนพลังงานมอเตอร์' }).click() // 🔓 emoji prefix, so no `exact`
    const restoreDialog = page.getByRole('dialog')
    await expect(restoreDialog.getByRole('button', { name: 'ยืนยันและคืนพลังงาน' })).toBeDisabled()
    await restoreDialog.getByPlaceholder('ใส่รหัสผ่านเพื่อยืนยัน').fill(SUPER_ADMIN_PASSWORD)
    await restoreDialog.getByRole('button', { name: 'ยืนยันและคืนพลังงาน' }).click()

    await expect(page.getByText('คืนพลังงานมอเตอร์สำเร็จ')).toBeVisible()
    await expect(page.getByText('พลังงานมอเตอร์ถูกตัดออกอยู่ในขณะนี้')).toHaveCount(0)
  })

  test('IoT device reset does not require a password', async ({ page }) => {
    await page.goto(`/fleet/vehicles/${vehicleId}`)
    await page.getByRole('button', { name: 'ควบคุมระยะไกล' }).click()
    await page.getByRole('button', { name: 'รีเซ็ตอุปกรณ์ IoT' }).click() // 🔁 emoji prefix, so no `exact`

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.getByPlaceholder('ใส่รหัสผ่านเพื่อยืนยัน')).toHaveCount(0)
    await dialog.getByRole('button', { name: 'ยืนยันรีเซ็ต' }).click()

    await expect(page.getByText('ส่งคำสั่งรีเซ็ตอุปกรณ์ IoT แล้ว')).toBeVisible()
  })
})
