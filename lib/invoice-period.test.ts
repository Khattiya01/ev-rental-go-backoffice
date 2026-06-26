import { describe, it, expect } from 'vitest'
import {
  buildMonthlyDueDate,
  formatDDMMYYYY,
  resolveDefaultMonthlyPeriod,
  shouldRunMonthlyInvoices,
} from './invoice-period'

describe('formatDDMMYYYY', () => {
  it('zero-pads day and month', () => {
    expect(formatDDMMYYYY(2026, 1, 5)).toBe('05/01/2026')
  })
})

describe('buildMonthlyDueDate', () => {
  it('reuses the contract start day for the target month', () => {
    expect(buildMonthlyDueDate('15/03/2025', 2026, 7)).toBe('15/07/2026')
  })

  it('clamps to the last day of a shorter target month (31st -> 30th in a 30-day month)', () => {
    expect(buildMonthlyDueDate('31/01/2025', 2026, 4)).toBe('30/04/2026')
  })

  it('clamps to the 28th in a non-leap February', () => {
    expect(buildMonthlyDueDate('31/01/2025', 2025, 2)).toBe('28/02/2025')
  })

  it('clamps to the 29th in a leap-year February', () => {
    expect(buildMonthlyDueDate('31/01/2025', 2028, 2)).toBe('29/02/2028')
  })

  it('falls back to day 1 when the start date is unparseable', () => {
    expect(buildMonthlyDueDate('garbage', 2026, 7)).toBe('01/07/2026')
  })
})

describe('resolveDefaultMonthlyPeriod', () => {
  it('targets next calendar month', () => {
    expect(resolveDefaultMonthlyPeriod(new Date(2026, 5, 25))).toEqual({ year: 2026, month: 7 })
  })

  it('rolls over to January of the next year in December', () => {
    expect(resolveDefaultMonthlyPeriod(new Date(2026, 11, 25))).toEqual({ year: 2027, month: 1 })
  })
})

describe('shouldRunMonthlyInvoices', () => {
  it('runs on the 25th with no override', () => {
    expect(shouldRunMonthlyInvoices(25, false)).toBe(true)
  })

  it('does not run on any other day without an override', () => {
    expect(shouldRunMonthlyInvoices(24, false)).toBe(false)
    expect(shouldRunMonthlyInvoices(26, false)).toBe(false)
    expect(shouldRunMonthlyInvoices(1, false)).toBe(false)
  })

  it('runs on any day when an explicit year/month override is supplied', () => {
    expect(shouldRunMonthlyInvoices(1, true)).toBe(true)
    expect(shouldRunMonthlyInvoices(30, true)).toBe(true)
  })
})
