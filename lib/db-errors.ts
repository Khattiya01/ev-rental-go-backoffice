/**
 * Drizzle ORM wraps postgres driver errors in DrizzleQueryError.
 * The original PostgresError (with .code) lives on error.cause, not the top-level error.
 * This helper walks the cause chain to find the postgres error code.
 */
function getPostgresCode(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined
  const e = error as Record<string, unknown>
  if (typeof e.code === 'string') return e.code
  if (e.cause) return getPostgresCode(e.cause)
  return undefined
}

export function isDuplicateKeyError(error: unknown): boolean {
  return getPostgresCode(error) === '23505'
}
