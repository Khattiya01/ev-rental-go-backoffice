import { parseFlexibleDate } from '@/lib/parse-flexible-date'

// Days a pending invoice is overdue relative to `today`. Both dates are
// normalized to midnight first so a partial-day difference (e.g. checking at
// 23:00) doesn't bias the count. Returns 0 for an invoice due today (not yet
// overdue), and null when `dueDate` can't be parsed.
export function calcDaysOverdue(dueDate: string, today: Date): number | null {
  const due = parseFlexibleDate(dueDate)
  if (!due) return null
  due.setHours(0, 0, 0, 0)

  const t = new Date(today)
  t.setHours(0, 0, 0, 0)

  return Math.floor((t.getTime() - due.getTime()) / 86_400_000)
}
