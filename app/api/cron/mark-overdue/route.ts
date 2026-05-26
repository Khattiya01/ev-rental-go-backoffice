import { NextResponse } from 'next/server'
import { eq, inArray, and } from 'drizzle-orm'
import { db } from '@/db'
import { invoices, alerts } from '@/db/schema'

// ─── Production setup ─────────────────────────────────────────────────────────
//
// Add to /etc/cron.d/ev-rental on Server 1 (runs daily at 00:01):
//
//   CRON_SECRET=<same value as in .env.local>
//   0 1 * * * root curl -sf \
//     -X POST \
//     -H "Authorization: Bearer $CRON_SECRET" \
//     http://localhost:3000/api/cron/mark-overdue \
//     >> /var/log/ev-rental-cron.log 2>&1
//
// Verify manually:
//   curl -s -X POST \
//     -H "Authorization: Bearer <secret>" \
//     http://localhost:3000/api/cron/mark-overdue | jq
// ─────────────────────────────────────────────────────────────────────────────

interface OverdueRow {
  id: string
  invoiceNo: string
  customerName: string
  amount: number
  dueDate: string
  daysOverdue: number
}

export async function POST(request: Request): Promise<NextResponse> {
  // ── Auth ─────────────────────────────────────────────────────────────────
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    console.error('[cron/mark-overdue] CRON_SECRET env var is not set')
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
  }

  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startedAt = Date.now()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  try {
    // ── Step 1: Find all pending invoices ───────────────────────────────────
    const pending = await db
      .select()
      .from(invoices)
      .where(eq(invoices.status, 'pending'))

    // ── Step 2: Compute which ones are now overdue ──────────────────────────
    const nowOverdue: OverdueRow[] = []

    for (const inv of pending) {
      try {
        const due = new Date(inv.dueDate)
        if (isNaN(due.getTime())) continue
        due.setHours(0, 0, 0, 0)
        const days = Math.floor((today.getTime() - due.getTime()) / 86_400_000)
        if (days > 0) {
          nowOverdue.push({
            id: inv.id,
            invoiceNo: inv.invoiceNo,
            customerName: inv.customerName,
            amount: inv.amount,
            dueDate: inv.dueDate,
            daysOverdue: days,
          })
        }
      } catch {
        // unparseable dueDate — skip
      }
    }

    if (nowOverdue.length === 0) {
      console.log(`[cron/mark-overdue] ran in ${Date.now() - startedAt}ms — no invoices to mark`)
      return NextResponse.json({ updated: 0, alertsCreated: 0, durationMs: Date.now() - startedAt })
    }

    const ids = nowOverdue.map(r => r.id)

    // ── Step 3: Check which invoice IDs already have an unresolved alert ────
    const existingAlerts = await db
      .select({ entityId: alerts.entityId })
      .from(alerts)
      .where(
        and(
          inArray(alerts.entityId, ids),
          eq(alerts.type, 'payment_overdue'),
          eq(alerts.resolved, false)
        )
      )

    const alreadyAlerted = new Set(existingAlerts.map(a => a.entityId))

    // ── Step 4: Transaction — update invoices + insert alerts ───────────────
    let alertsCreated = 0

    await db.transaction(async tx => {
      for (const inv of nowOverdue) {
        await tx
          .update(invoices)
          .set({ status: 'overdue', daysOverdue: inv.daysOverdue })
          .where(eq(invoices.id, inv.id))

        if (!alreadyAlerted.has(inv.id)) {
          await tx.insert(alerts).values({
            type: 'payment_overdue',
            severity: 'critical',
            message: `Invoice ${inv.invoiceNo} (${inv.customerName}) เกินกำหนดชำระ ${inv.daysOverdue} วัน ยอด ฿${inv.amount.toLocaleString('th-TH', { maximumFractionDigits: 0 })}`,
            entityId: inv.id,
          })
          alertsCreated++
        }
      }
    })

    const durationMs = Date.now() - startedAt
    console.log(`[cron/mark-overdue] marked ${nowOverdue.length} overdue, created ${alertsCreated} alerts in ${durationMs}ms`)

    return NextResponse.json({
      updated: nowOverdue.length,
      alertsCreated,
      durationMs,
      invoices: nowOverdue.map(inv => ({
        invoiceNo: inv.invoiceNo,
        customerName: inv.customerName,
        daysOverdue: inv.daysOverdue,
      })),
    })
  } catch (err) {
    console.error('[cron/mark-overdue] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
