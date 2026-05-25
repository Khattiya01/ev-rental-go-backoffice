import { NextResponse } from 'next/server'
import { sql, and, eq, gte } from 'drizzle-orm'
import { db } from '@/db'
import { invoices } from '@/db/schema'
import { getCurrentUser } from '@/lib/dal'

export async function GET(): Promise<NextResponse> {
  const currentUser = await getCurrentUser()
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
  sevenDaysAgo.setHours(0, 0, 0, 0)

  const rows = await db
    .select({
      day: sql<string>`TO_CHAR(DATE_TRUNC('day', ${invoices.createdAt}), 'Dy')`,
      dateKey: sql<string>`DATE_TRUNC('day', ${invoices.createdAt})::text`,
      revenue: sql<number>`COALESCE(SUM(${invoices.amount}), 0)`,
    })
    .from(invoices)
    .where(and(eq(invoices.status, 'paid'), gte(invoices.createdAt, sevenDaysAgo)))
    .groupBy(sql`DATE_TRUNC('day', ${invoices.createdAt})`)
    .orderBy(sql`DATE_TRUNC('day', ${invoices.createdAt})`)

  return NextResponse.json({ data: buildLast7Days(rows) })
}

function buildLast7Days(dbRows: { day: string; dateKey: string; revenue: number }[]) {
  const map = new Map(
    dbRows.map(r => [r.dateKey.slice(0, 10), { day: r.day, revenue: Number(r.revenue) }])
  )

  const result = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    d.setHours(0, 0, 0, 0)
    const key = d.toISOString().slice(0, 10)
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' })
    result.push(map.get(key) ?? { day: dayName, revenue: 0 })
  }
  return result
}
