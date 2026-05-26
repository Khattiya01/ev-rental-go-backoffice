import { NextResponse } from 'next/server'
import { eq, and, desc } from 'drizzle-orm'
import { db } from '@/db'
import { contracts, invoices } from '@/db/schema'

// ─── Production setup ─────────────────────────────────────────────────────────
//
// Add to /etc/cron.d/ev-rental on Server 1 (runs daily at 08:00):
//
//   CRON_SECRET=<same value as in .env.local>
//   0 8 * * * root curl -sf \
//     -X POST \
//     -H "Authorization: Bearer $CRON_SECRET" \
//     "http://localhost:3000/api/cron/generate-invoices" \
//     >> /var/log/ev-rental-cron.log 2>&1
//
// Test specific date (daily invoices):
//   curl -s -X POST -H "Authorization: Bearer <secret>" \
//     "http://localhost:3000/api/cron/generate-invoices?date=2025-06-15" | jq
//
// Test specific period (monthly invoices):
//   curl -s -X POST -H "Authorization: Bearer <secret>" \
//     "http://localhost:3000/api/cron/generate-invoices?year=2025&month=7" | jq
// ─────────────────────────────────────────────────────────────────────────────

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน',
  'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม',
  'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
]

async function getNextInvoiceNo(): Promise<number> {
  const [last] = await db
    .select({ invoiceNo: invoices.invoiceNo })
    .from(invoices)
    .orderBy(desc(invoices.createdAt))
    .limit(1)
  if (!last) return 1
  const match = last.invoiceNo.match(/INV-(\d+)/)
  if (!match) return 1
  return parseInt(match[1], 10) + 1
}

function formatDDMMYYYY(year: number, month: number, day: number): string {
  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`
}

// Extract day from DD/MM/YYYY and build due date in target month (clamp to last day)
function buildMonthlyDueDate(contractStartDate: string, year: number, month: number): string {
  const [dayStr] = contractStartDate.split('/')
  const day = parseInt(dayStr, 10) || 1
  const lastDayOfMonth = new Date(year, month, 0).getDate()
  return formatDDMMYYYY(year, month, Math.min(day, lastDayOfMonth))
}

interface GeneratedRow {
  invoiceNo: string
  contractNo: string
  customerName: string
  amount: number
  dueDate: string
  billingType: string
}

export async function POST(request: Request): Promise<NextResponse> {
  // ── Auth ─────────────────────────────────────────────────────────────────
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    console.error('[cron/generate-invoices] CRON_SECRET env var is not set')
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
  }
  if (request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startedAt = Date.now()
  const { searchParams } = new URL(request.url)

  // ── Resolve today's date (override with ?date=YYYY-MM-DD for testing) ────
  let today: Date
  const qDate = searchParams.get('date')
  if (qDate) {
    today = new Date(qDate)
    if (isNaN(today.getTime())) return NextResponse.json({ error: 'Invalid date parameter' }, { status: 400 })
  } else {
    today = new Date()
  }
  const todayYear  = today.getFullYear()
  const todayMonth = today.getMonth() + 1  // 1–12
  const todayDay   = today.getDate()

  // ── Resolve monthly target period (override with ?year=&month=) ──────────
  let monthlyTargetYear: number
  let monthlyTargetMonth: number
  const qYear  = searchParams.get('year')
  const qMonth = searchParams.get('month')
  if (qYear && qMonth) {
    monthlyTargetYear  = parseInt(qYear,  10)
    monthlyTargetMonth = parseInt(qMonth, 10)
    if (isNaN(monthlyTargetYear) || isNaN(monthlyTargetMonth) || monthlyTargetMonth < 1 || monthlyTargetMonth > 12) {
      return NextResponse.json({ error: 'Invalid year/month parameters' }, { status: 400 })
    }
  } else {
    // Default: next month
    const next = new Date(todayYear, todayMonth, 1)
    monthlyTargetYear  = next.getFullYear()
    monthlyTargetMonth = next.getMonth() + 1
  }

  // Monthly generation only runs on the 25th (unless year/month override given)
  const shouldRunMonthly = todayDay === 25 || (qYear !== null && qMonth !== null)

  // ── Fetch all active contracts ────────────────────────────────────────────
  const activeContracts = await db
    .select()
    .from(contracts)
    .where(eq(contracts.status, 'active'))

  if (activeContracts.length === 0) {
    return NextResponse.json({ generated: 0, skipped: 0, durationMs: Date.now() - startedAt })
  }

  const monthlyContracts = activeContracts.filter(c => (c.billingType ?? 'monthly') === 'monthly')
  const dailyContracts   = activeContracts.filter(c => c.billingType === 'daily')

  // ── Find already-generated invoices to skip duplicates ───────────────────
  // Monthly: same contractId + periodYear + periodMonth (periodDay IS NULL)
  const existingMonthly = shouldRunMonthly
    ? await db.select({ contractId: invoices.contractId }).from(invoices).where(
        and(eq(invoices.periodYear, monthlyTargetYear), eq(invoices.periodMonth, monthlyTargetMonth))
      )
    : []
  const alreadyMonthly = new Set(existingMonthly.map(r => r.contractId).filter(Boolean) as string[])

  // Daily: same contractId + periodYear + periodMonth + periodDay
  const existingDaily = await db.select({ contractId: invoices.contractId }).from(invoices).where(
    and(
      eq(invoices.periodYear,  todayYear),
      eq(invoices.periodMonth, todayMonth),
      eq(invoices.periodDay,   todayDay),
    )
  )
  const alreadyDaily = new Set(existingDaily.map(r => r.contractId).filter(Boolean) as string[])

  // ── Insert invoices ───────────────────────────────────────────────────────
  let nextNo = await getNextInvoiceNo()
  let generated = 0
  let skipped   = 0
  const generatedList: GeneratedRow[] = []

  // Monthly invoices
  if (shouldRunMonthly) {
    const buddhistYear = monthlyTargetYear + 543
    const monthLabel   = `${THAI_MONTHS[monthlyTargetMonth - 1]} ${buddhistYear}`

    for (const contract of monthlyContracts) {
      if (alreadyMonthly.has(contract.id)) { skipped++; continue }

      const invoiceNo = `INV-${String(nextNo).padStart(4, '0')}`
      const dueDate   = buildMonthlyDueDate(contract.startDate, monthlyTargetYear, monthlyTargetMonth)

      await db.insert(invoices).values({
        invoiceNo,
        contractId:  contract.id,
        customerId:  contract.customerId,
        customerName: contract.customerName,
        vehiclePlate: contract.vehiclePlate,
        billingType: 'monthly',
        description: `ค่าเช่ารถประจำเดือน${monthLabel}`,
        amount:      contract.monthlyRate,
        dueDate,
        status:      'pending',
        periodYear:  monthlyTargetYear,
        periodMonth: monthlyTargetMonth,
      })

      generatedList.push({ invoiceNo, contractNo: contract.contractNo, customerName: contract.customerName, amount: contract.monthlyRate, dueDate, billingType: 'monthly' })
      nextNo++
      generated++
    }
  }

  // Daily invoices
  const buddhistYearToday = todayYear + 543
  const todayLabel = `${String(todayDay).padStart(2, '0')} ${THAI_MONTHS[todayMonth - 1]} ${buddhistYearToday}`
  const todayDueDate = formatDDMMYYYY(todayYear, todayMonth, todayDay)

  for (const contract of dailyContracts) {
    if (alreadyDaily.has(contract.id)) { skipped++; continue }

    const invoiceNo = `INV-${String(nextNo).padStart(4, '0')}`

    await db.insert(invoices).values({
      invoiceNo,
      contractId:  contract.id,
      customerId:  contract.customerId,
      customerName: contract.customerName,
      vehiclePlate: contract.vehiclePlate,
      billingType: 'daily',
      description: `ค่าเช่ารายวัน ${todayLabel}`,
      amount:      contract.dailyRate,
      dueDate:     todayDueDate,
      status:      'pending',
      periodYear:  todayYear,
      periodMonth: todayMonth,
      periodDay:   todayDay,
    })

    generatedList.push({ invoiceNo, contractNo: contract.contractNo, customerName: contract.customerName, amount: contract.dailyRate, dueDate: todayDueDate, billingType: 'daily' })
    nextNo++
    generated++
  }

  const durationMs = Date.now() - startedAt
  console.log(`[cron/generate-invoices] generated ${generated} (monthly: ${shouldRunMonthly}, daily: ${dailyContracts.length - skipped}), skipped ${skipped} in ${durationMs}ms`)

  return NextResponse.json({
    date: formatDDMMYYYY(todayYear, todayMonth, todayDay),
    monthlyPeriod: shouldRunMonthly ? `${monthlyTargetMonth}/${monthlyTargetYear}` : null,
    generated,
    skipped,
    durationMs,
    invoices: generatedList,
  })
}
