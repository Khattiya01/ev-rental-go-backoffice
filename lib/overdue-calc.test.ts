import { describe, it, expect } from 'vitest'
import { calcDaysOverdue } from './overdue-calc'

describe('calcDaysOverdue', () => {
  it('returns 0 for an invoice due today (not yet overdue)', () => {
    expect(calcDaysOverdue('26/06/2026', new Date(2026, 5, 26, 23, 0))).toBe(0)
  })

  it('returns 1 for an invoice due yesterday', () => {
    expect(calcDaysOverdue('25/06/2026', new Date(2026, 5, 26, 8, 0))).toBe(1)
  })

  it('correctly handles a due day past the 12th — regression for the DD/MM/YYYY vs MM/DD/YYYY mix-up', () => {
    // new Date('26/06/2026') is Invalid Date (no month 26); the dedicated
    // parser must read this as 26 June, one day before "today".
    expect(calcDaysOverdue('26/06/2026', new Date(2026, 5, 27))).toBe(1)
  })

  it('returns a negative number for a due date in the future', () => {
    expect(calcDaysOverdue('30/06/2026', new Date(2026, 5, 26))).toBe(-4)
  })

  it('counts whole days regardless of time-of-day on either side', () => {
    expect(calcDaysOverdue('01/06/2026', new Date(2026, 5, 11, 23, 59))).toBe(10)
  })

  it('treats a due date and "now" on the same calendar day as 0 days overdue regardless of time-of-day', () => {
    // Due "today" at 00:05 and "now" at 23:55 the same day must still read
    // as 0 days overdue, not 1, since both get normalized to midnight.
    expect(calcDaysOverdue('26/06/2026', new Date(2026, 5, 26, 23, 55))).toBe(0)
  })

  it('returns null for an unparseable due date', () => {
    expect(calcDaysOverdue('not-a-date', new Date())).toBeNull()
  })

  it('also accepts the YYYY-MM-DD format used by the manual invoice form', () => {
    expect(calcDaysOverdue('2026-06-25', new Date(2026, 5, 26))).toBe(1)
  })
})
