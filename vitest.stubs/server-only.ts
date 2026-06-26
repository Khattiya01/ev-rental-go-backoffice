// Stub for the `server-only` poison-pill package.
// Real `server-only` only resolves through Next.js's webpack build (which aliases it
// to an internal no-op for the server bundle and an error-thrower for the client bundle).
// Outside that build (plain Node/Vitest), the bare specifier doesn't resolve at all, so
// vitest.config.ts aliases it here instead — this file intentionally does nothing.
export {}
