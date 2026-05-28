import { NextResponse } from 'next/server'
import { eq, and, inArray } from 'drizzle-orm'
import { db } from '@/db'
import { contracts, invoices, alerts } from '@/db/schema'

// ─── Production setup ─────────────────────────────────────────────────────────
//
// Add to /etc/cron.d/ev-rental on Server 1 (runs daily at 07:00):
//
//   CRON_SECRET=<same value as in .env.local>
//   0 7 * * * root curl -sf \
//     -X POST \
//     -H "Authorization: Bearer $CRON_SECRET" \
//     http://localhost:3000/api/cron/payment-reminders \
//     >> /var/log/ev-rental-cron.log 2>&1
//
// Verify manually:
//   curl -s -X POST \
//     -H "Authorization: Bearer <secret>" \
//     http://localhost:3000/api/cron/payment-reminders | jq
// ─────────────────────────────────────────────────────────────────────────────

const REMINDER_DAYS = 3

// Supports both YYYY-MM-DD (HTML date input) and DD/MM/YYYY (generate-invoices cron)
function parseDate(str: string): Date | null {
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const d = new Date(str)
    return isNaN(d.getTime()) ? null : d
  }
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    const [day, month, year] = str.split('/')
    const d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
    return isNaN(d.getTime()) ? null : d
  }
  return null
}

export async function POST(request: Request): Promise<NextResponse> {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    console.error('[cron/payment-reminders] CRON_SECRET env var is not set')
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
  }
  if (request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startedAt = Date.now()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const threshold = new Date(today)
  threshold.setDate(threshold.getDate() + REMINDER_DAYS)

  // ── Step 1: Find active contracts with autoReminder enabled ───────────────
  const remindableContracts = await db
    .select({ id: contracts.id, contractNo: contracts.contractNo })
    .from(contracts)
    .where(and(eq(contracts.autoReminder, true), eq(contracts.status, 'active')))

  if (remindableContracts.length === 0) {
    return NextResponse.json({ contractsChecked: 0, reminded: 0, durationMs: Date.now() - startedAt })
  }

  const contractIds = remindableContracts.map(c => c.id)

  // ── Step 2: Find pending invoices for those contracts ─────────────────────
  const pendingInvoices = await db
    .select()
    .from(invoices)
    .where(and(
      inArray(invoices.contractId, contractIds),
      eq(invoices.status, 'pending'),
    ))

  // ── Step 3: Filter to invoices due within the next REMINDER_DAYS days ─────
  const dueSoon = pendingInvoices.filter(inv => {
    const due = parseDate(inv.dueDate)
    if (!due) return false
    due.setHours(0, 0, 0, 0)
    return due >= today && due <= threshold
  })

  if (dueSoon.length === 0) {
    return NextResponse.json({
      contractsChecked: remindableContracts.length,
      reminded: 0,
      durationMs: Date.now() - startedAt,
    })
  }

  // ── Step 4: Check which invoice IDs already have an unresolved reminder ───
  const invoiceIds = dueSoon.map(inv => inv.id)
  const existingAlerts = await db
    .select({ entityId: alerts.entityId })
    .from(alerts)
    .where(and(
      inArray(alerts.entityId, invoiceIds),
      eq(alerts.type, 'payment_reminder'),
      eq(alerts.resolved, false),
    ))
  const alreadyAlerted = new Set(existingAlerts.map(a => a.entityId))

  // ── Step 5: Insert reminder alerts ───────────────────────────────────────
  let reminded = 0
  const remindedList: { invoiceNo: string; customerName: string; dueDate: string; daysUntilDue: number }[] = []

  for (const inv of dueSoon) {
    if (alreadyAlerted.has(inv.id)) continue

    const due = parseDate(inv.dueDate)!
    due.setHours(0, 0, 0, 0)
    const daysUntilDue = Math.round((due.getTime() - today.getTime()) / 86_400_000)
    const daysLabel = daysUntilDue === 0 ? 'วันนี้' : `อีก ${daysUntilDue} วัน`

    await db.insert(alerts).values({
      type: 'payment_reminder',
      severity: 'warning',
      message: `Invoice ${inv.invoiceNo} (${inv.customerName}) ครบกำหนดชำระ${daysLabel} ยอด ฿${inv.amount.toLocaleString('th-TH', { maximumFractionDigits: 0 })}`,
      entityId: inv.id,
    })

    remindedList.push({ invoiceNo: inv.invoiceNo, customerName: inv.customerName, dueDate: inv.dueDate, daysUntilDue })
    reminded++
  }

  const durationMs = Date.now() - startedAt
  console.log(`[cron/payment-reminders] checked ${remindableContracts.length} contracts, created ${reminded} reminder alerts in ${durationMs}ms`)

  return NextResponse.json({
    contractsChecked: remindableContracts.length,
    reminded,
    durationMs,
    invoices: remindedList,
  })
}
