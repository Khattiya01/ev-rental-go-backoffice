import { describe, it, expect } from 'vitest'
import { isDuplicateKeyError } from './db-errors'

describe('isDuplicateKeyError', () => {
  it('returns true for a raw Postgres unique_violation (23505)', () => {
    expect(isDuplicateKeyError({ code: '23505' })).toBe(true)
  })

  it('returns false for a different Postgres error code', () => {
    expect(isDuplicateKeyError({ code: '23503' })).toBe(false) // foreign_key_violation
  })

  it('walks the .cause chain — Drizzle wraps the real PostgresError there', () => {
    expect(isDuplicateKeyError({ message: 'DrizzleQueryError', cause: { code: '23505' } })).toBe(true)
  })

  it('walks multiple levels of nested .cause', () => {
    expect(isDuplicateKeyError({ cause: { cause: { code: '23505' } } })).toBe(true)
  })

  it('returns false when no .code is found anywhere in the chain', () => {
    expect(isDuplicateKeyError({ cause: new Error('plain error, no code') })).toBe(false)
  })

  it('returns false for null, undefined, and non-object values without throwing', () => {
    expect(isDuplicateKeyError(null)).toBe(false)
    expect(isDuplicateKeyError(undefined)).toBe(false)
    expect(isDuplicateKeyError('just a string')).toBe(false)
    expect(isDuplicateKeyError(42)).toBe(false)
  })
})
