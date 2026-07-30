import { NextResponse } from 'next/server'
import { desc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { invoices, payments } from '@/db/schema'
import { getCurrentUser } from '@/lib/dal'
import { requirePermission } from '@/lib/permissions'
import type { InvoiceStatus, PaymentStatus, Payment } from '@/lib/types'

interface PaymentStatusResponse {
  invoiceStatus: InvoiceStatus
  paymentStatus: PaymentStatus | null
  receiptUrl: string | null
  // Additive field — full payment attempt history for this invoice, latest
  // first. Existing consumers (e.g. the invoice detail page's polling logic)
  // only read the fields above and keep working unmodified.
  payments: Pick<Payment, 'id' | 'status' | 'method' | 'amount' | 'receiptUrl' | 'createdAt' | 'paidAt'>[]
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const currentUser = await getCurrentUser()
  if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const denied = await requirePermission(currentUser, 'billing', 'canRead')
  if (denied) return denied

  const { id } = await params

  try {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id)).limit(1)
    if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })

    // No status filter here by design — this reflects the full payment attempt
    // history (pending/succeeded/failed/canceled/expired), unlike the pending-only
    // reuse-check query in payment-intent/route.ts, which serves a different purpose.
    const paymentHistory = await db
      .select()
      .from(payments)
      .where(eq(payments.invoiceId, id))
      .orderBy(desc(payments.createdAt))

    const latestPayment = paymentHistory[0]

    const payload: PaymentStatusResponse = {
      invoiceStatus: invoice.status,
      paymentStatus: latestPayment?.status ?? null,
      receiptUrl: latestPayment?.receiptUrl ?? null,
      payments: paymentHistory.map(p => ({
        id: p.id,
        status: p.status,
        method: p.method,
        amount: p.amount,
        receiptUrl: p.receiptUrl,
        createdAt: p.createdAt.toISOString(),
        paidAt: p.paidAt ? p.paidAt.toISOString() : null,
      })),
    }

    return NextResponse.json(payload)
  } catch (err) {
    console.error('[GET /api/invoices/[id]/payment-status] failed:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
