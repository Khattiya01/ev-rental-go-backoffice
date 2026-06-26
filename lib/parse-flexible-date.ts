// Invoice due dates come from two sources with different formats: the
// generate-invoices cron writes DD/MM/YYYY, while the manual invoice form
// posts the HTML date input's YYYY-MM-DD. Passing either straight to
// `new Date(str)` is unsafe — the bare constructor reads slash-separated
// dates as MM/DD/YYYY, so DD/MM/YYYY values silently misparse (or fail
// entirely once the day exceeds 12).
export function parseFlexibleDate(str: string): Date | null {
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const d = new Date(str)
    return isNaN(d.getTime()) ? null : d
  }
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    const [dayStr, monthStr, yearStr] = str.split('/')
    const day = parseInt(dayStr, 10)
    const month = parseInt(monthStr, 10)
    const year = parseInt(yearStr, 10)
    if (month < 1 || month > 12 || day < 1 || day > 31) return null
    const d = new Date(year, month - 1, day)
    // Catches both NaN and silent rollovers (e.g. Feb 30 -> Mar 2) by
    // confirming the constructed date still reflects the input fields.
    if (isNaN(d.getTime()) || d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) {
      return null
    }
    return d
  }
  return null
}
