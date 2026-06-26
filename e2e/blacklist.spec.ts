import { test, expect, type APIRequestContext } from '@playwright/test'
import path from 'path'

const AUTH_DIR = path.join(__dirname, '.auth')
// Active customer from db/seed.ts (contract EVR-2024-003) — not used by other specs.
const SEEDED_CUSTOMER_NAME = 'สุภา รักชาติ'
const BAN_REASON = 'ค้างชำระค่าเช่าเกิน 60 วัน'

test.use({ storageState: path.join(AUTH_DIR, 'super_admin.json') })

async function findCustomerId(request: APIRequestContext): Promise<string> {
  const res = await request.get(`/api/customers?search=${encodeURIComponent(SEEDED_CUSTOMER_NAME)}`)
  expect(res.ok(), 'customer lookup by name failed').toBeTruthy()
  const { data } = await res.json() as { data: { id: string; name: string }[] }
  const customer = data.find(c => c.name === SEEDED_CUSTOMER_NAME)
  if (!customer) throw new Error(`seeded customer "${SEEDED_CUSTOMER_NAME}" not found`)
  return customer.id
}

test.describe('customer blacklist — ban with reason, list, and unban', () => {
  let customerId: string

  test.beforeAll(async ({ request }) => {
    customerId = await findCustomerId(request)
  })

  // Leave the seeded customer back in 'active' state so reruns (and any other
  // spec relying on this fixture) start from the same baseline.
  test.afterEach(async ({ request }) => {
    await request.patch(`/api/customers/${customerId}`, { data: { status: 'active' } })
  })

  test('blacklisting requires a reason — confirm without typing one shows an inline error and does not submit', async ({ page }) => {
    await page.goto(`/customers/${customerId}`)
    await page.getByRole('button', { name: 'ขึ้นบัญชีดำ' }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await dialog.getByRole('button', { name: 'ยืนยันขึ้นบัญชีดำ' }).click()

    await expect(dialog.getByText('กรุณาระบุเหตุผลในการแบน')).toBeVisible()
    await expect(dialog).toBeVisible() // still open — not submitted
  })

  test('blacklisting with a reason bans the customer and the reason shows up on the blacklist page', async ({ page }) => {
    await page.goto(`/customers/${customerId}`)
    await page.getByRole('button', { name: 'ขึ้นบัญชีดำ' }).click()

    const dialog = page.getByRole('dialog')
    await dialog.getByPlaceholder('ระบุเหตุผลการแบน...').fill(BAN_REASON)
    await dialog.getByRole('button', { name: 'ยืนยันขึ้นบัญชีดำ' }).click()

    await expect(page.getByText('ขึ้นบัญชีดำเรียบร้อยแล้ว')).toBeVisible()
    await expect(dialog).toBeHidden()
    // Profile page itself now shows the reactivate (un-blacklist) action instead of ban/suspend.
    await expect(page.getByRole('button', { name: 'กู้คืนบัญชี' })).toBeVisible()

    await page.goto('/customers/blacklist')
    const row = page.locator('tr', { hasText: SEEDED_CUSTOMER_NAME })
    await expect(row).toBeVisible()
    await expect(row.getByText(BAN_REASON)).toBeVisible()
  })

  test('unban from the blacklist page restores the customer to active', async ({ page }) => {
    await page.goto(`/customers/${customerId}`)
    await page.getByRole('button', { name: 'ขึ้นบัญชีดำ' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByPlaceholder('ระบุเหตุผลการแบน...').fill(BAN_REASON)
    await dialog.getByRole('button', { name: 'ยืนยันขึ้นบัญชีดำ' }).click()
    await expect(page.getByText('ขึ้นบัญชีดำเรียบร้อยแล้ว')).toBeVisible()

    await page.goto('/customers/blacklist')
    const row = page.locator('tr', { hasText: SEEDED_CUSTOMER_NAME })
    await row.getByRole('button', { name: 'Unban' }).click()

    const unbanDialog = page.getByRole('dialog')
    await expect(unbanDialog.getByText(`คุณต้องการยกเลิก Blacklist ลูกค้า ${SEEDED_CUSTOMER_NAME} ใช่หรือไม่?`)).toBeVisible()
    await unbanDialog.getByRole('button', { name: 'ยืนยัน Unban' }).click()

    await expect(page.getByText(`ยกเลิก Blacklist ${SEEDED_CUSTOMER_NAME} เรียบร้อย`)).toBeVisible()
    // Row disappears from the (client-filtered) blacklist list immediately.
    await expect(page.locator('tr', { hasText: SEEDED_CUSTOMER_NAME })).toHaveCount(0)

    await page.goto(`/customers/${customerId}`)
    await expect(page.getByRole('button', { name: 'ขึ้นบัญชีดำ' })).toBeVisible()
  })

  // The "block new contract creation for a blacklisted customer" rule is already
  // enforced server-side (app/api/contracts/route.ts, 409 "...ถูก Blacklist") and
  // covered by the Postman collection's RBAC/validation suite. There is currently
  // no contract-creation UI anywhere in the app (no /contracts/new page or modal)
  // to drive this through the browser — tracked here so it isn't silently dropped
  // once that UI ships.
  test.fixme('attempting to create a contract for a blacklisted customer is blocked in the UI with a clear message', async () => {})
})
