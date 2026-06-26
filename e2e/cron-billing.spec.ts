import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'
import {
  seedCustomer, seedVehicle, seedContract, seedInvoice,
  deleteContracts, deleteCustomers, deleteVehicles, deleteInvoices, deleteInvoicesByContractIds,
  closeBillingDb,
} from './fixtures/billing-db'

// These cron routes are hit directly with the CRON_SECRET bearer token (the same
// way the real `cron.d` entry calls them — see the route file header comment),
// not through any UI action, so no storageState/login is needed for this file.
const AUTH_DIR = path.join(__dirname, '.auth')

function loadCronSecret(): string {
  const envPath = path.join(__dirname, '../.env.test')
  const content = fs.readFileSync(envPath, 'utf-8')
  const match = content.match(/^CRON_SECRET=(.+)$/m)
  if (!match) throw new Error('CRON_SECRET not found in .env.test')
  return match[1].trim()
}

const CRON_SECRET = loadCronSecret()

test.use({ storageState: path.join(AUTH_DIR, 'super_admin.json') })

// generate-invoices processes *every* active contract in the table on each
// call (not scoped to a single test's fixture rows), so two of these tests
// running in different workers at once race on the same global query —
// whichever request happens to run first sees (and reports) the other test's
// contract too. Same class of bug as the alerts-page/notification-bell race
// fixed in alerts.spec.ts.
test.describe.configure({ mode: 'serial' })

test.describe('cron billing jobs', () => {
  test.afterAll(async () => {
    await closeBillingDb()
  })

  test('generate-invoices creates a daily invoice for an active daily contract, visible in /billing/invoices', async ({ page, request }) => {
    const marker = `E2E-CRON-GEN-${Date.now()}`
    const customerId = await seedCustomer(marker)
    const vehicleId = await seedVehicle(marker.slice(0, 20))
    const contractId = await seedContract({
      contractNo: marker,
      customerId,
      vehicleId,
      customerName: marker,
      vehiclePlate: marker.slice(0, 20),
      billingType: 'daily',
      dailyRate: 777,
      monthlyRate: 9999,
    })

    try {
      const res = await request.post('/api/cron/generate-invoices', {
        headers: { Authorization: `Bearer ${CRON_SECRET}` },
      })
      expect(res.ok()).toBeTruthy()
      const json = await res.json() as { generated: number; invoices: Array<{ contractNo: string; amount: number; billingType: string }> }
      const own = json.invoices.find(i => i.contractNo === marker)
      expect(own).toBeTruthy()
      expect(own?.amount).toBe(777)
      expect(own?.billingType).toBe('daily')

      await page.goto('/billing/invoices')
      await page.getByPlaceholder('ค้นหาชื่อลูกค้า, เลข Invoice, ทะเบียน...').fill(marker)
      await expect(page.getByText(marker, { exact: false }).first()).toBeVisible()
      await expect(page.getByText('฿777')).toBeVisible()
    } finally {
      await deleteInvoicesByContractIds([contractId])
      await deleteContracts([contractId])
      await Promise.all([deleteVehicles([vehicleId]), deleteCustomers([customerId])])
    }
  })

  test('calling generate-invoices twice for the same day does not create a duplicate daily invoice', async ({ request }) => {
    const marker = `E2E-CRON-DUP-${Date.now()}`
    const customerId = await seedCustomer(marker)
    const vehicleId = await seedVehicle(marker.slice(0, 20))
    const contractId = await seedContract({
      contractNo: marker,
      customerId,
      vehicleId,
      customerName: marker,
      vehiclePlate: marker.slice(0, 20),
      billingType: 'daily',
      dailyRate: 500,
      monthlyRate: 9999,
    })

    try {
      const headers = { Authorization: `Bearer ${CRON_SECRET}` }
      const first = await request.post('/api/cron/generate-invoices', { headers })
      const firstJson = await first.json() as { invoices: Array<{ contractNo: string }> }
      expect(firstJson.invoices.some(i => i.contractNo === marker)).toBe(true)

      const second = await request.post('/api/cron/generate-invoices', { headers })
      const secondJson = await second.json() as { invoices: Array<{ contractNo: string }> }
      expect(secondJson.invoices.some(i => i.contractNo === marker)).toBe(false)
    } finally {
      await deleteInvoicesByContractIds([contractId])
      await deleteContracts([contractId])
      await Promise.all([deleteVehicles([vehicleId]), deleteCustomers([customerId])])
    }
  })

  test('mark-overdue flips a past-due pending invoice to overdue and it appears on /billing/overdue', async ({ page, request }) => {
    const yesterday = new Date(Date.now() - 86_400_000)
    const dueDate = `${String(yesterday.getDate()).padStart(2, '0')}/${String(yesterday.getMonth() + 1).padStart(2, '0')}/${yesterday.getFullYear()}`
    const marker = `E2E-CRON-OVERDUE-${Date.now()}`
    // INV- prefix keeps the cron's own invoice-numbering regex happy if this row
    // ever becomes the most-recently-created invoice in the table; a large/unique
    // suffix avoids colliding with real sequential invoice numbers.
    const invoiceNo = `INV-${Date.now() % 100000}`
    const invoiceId = await seedInvoice({ invoiceNo, customerName: marker, amount: 1234, dueDate, status: 'pending' })

    try {
      const res = await request.post('/api/cron/mark-overdue', {
        headers: { Authorization: `Bearer ${CRON_SECRET}` },
      })
      expect(res.ok()).toBeTruthy()
      const json = await res.json() as { updated: number; invoices: Array<{ invoiceNo: string; daysOverdue: number }> }
      const own = json.invoices.find(i => i.invoiceNo === invoiceNo)
      expect(own).toBeTruthy()
      expect(own?.daysOverdue).toBe(1)

      await page.goto('/billing/overdue')
      await page.getByPlaceholder('ค้นหาลูกค้า, เลขที่ Invoice, ทะเบียนรถ...').fill(marker)
      await expect(page.getByText(invoiceNo)).toBeVisible()
      await expect(page.getByText('1 วัน', { exact: true })).toBeVisible()
    } finally {
      await deleteInvoices([invoiceId])
    }
  })
})
