export function formatDDMMYYYY(year: number, month: number, day: number): string {
  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`
}

// Extract day from a DD/MM/YYYY contract start date and build the due date in
// the target month, clamping to that month's last day (e.g. a contract that
// started on the 31st bills on the 28th/29th in February).
export function buildMonthlyDueDate(contractStartDate: string, year: number, month: number): string {
  const [dayStr] = contractStartDate.split('/')
  const day = parseInt(dayStr, 10) || 1
  const lastDayOfMonth = new Date(year, month, 0).getDate()
  return formatDDMMYYYY(year, month, Math.min(day, lastDayOfMonth))
}

export interface MonthlyPeriod {
  year: number
  month: number
}

// Default monthly target period is "next calendar month" relative to `today`.
export function resolveDefaultMonthlyPeriod(today: Date): MonthlyPeriod {
  const next = new Date(today.getFullYear(), today.getMonth() + 1, 1)
  return { year: next.getFullYear(), month: next.getMonth() + 1 }
}

// Monthly invoice generation only runs on the 25th of the month, unless the
// caller supplies an explicit year/month override (manual backfill run).
export function shouldRunMonthlyInvoices(todayDay: number, hasExplicitOverride: boolean): boolean {
  return todayDay === 25 || hasExplicitOverride
}
