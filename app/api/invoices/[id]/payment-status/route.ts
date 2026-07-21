import { NextResponse } from 'next/server'
import { desc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { invoices, payments } from '@/db/schema'
import { getCurrentUser } from '@/lib/dal'
import { requirePermission } from '@/lib/permissions'
import type { InvoiceStatus, PaymentStatus } from '@/lib/types'

interface PaymentStatusResponse {
  invoiceStatus: InvoiceStatus
  paymentStatus: PaymentStatus | null
  receiptUrl: string | null
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

    // No status filter here by design — this reflects the true latest payment attempt
    // (pending/succeeded/failed/canceled/expired), unlike the pending-only reuse-check
    // query in payment-intent/route.ts, which serves a different purpose.
    const [latestPayment] = await db
      .select()
      .from(payments)
      .where(eq(payments.invoiceId, id))
      .orderBy(desc(payments.createdAt))
      .limit(1)

    const payload: PaymentStatusResponse = {
      invoiceStatus: invoice.status,
      paymentStatus: latestPayment?.status ?? null,
      receiptUrl: latestPayment?.receiptUrl ?? null,
    }

    return NextResponse.json(payload)
  } catch (err) {
    console.error('[GET /api/invoices/[id]/payment-status] failed:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
