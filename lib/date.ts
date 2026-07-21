/**
 * Formats a Date the way display-string date columns (e.g. `invoices.paidAt`,
 * `invoices.dueDate`) render dates across the billing UI — e.g. "21 ก.ค. 69".
 * Shared so every call site producing one of these strings stays in sync.
 */
export function formatThaiDate(date: Date): string {
  return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })
}
