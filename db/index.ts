import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

const connectionString = process.env.DATABASE_URL!

// Global singleton prevents HMR from creating new connection pools on every hot reload
const globalForDb = globalThis as unknown as {
  _pgClient: postgres.Sql | undefined
}

// Disable prefetch as it is not supported for "Transaction" pool mode
const client = globalForDb._pgClient ?? postgres(connectionString, { prepare: false, max: 1 })

if (process.env.NODE_ENV !== 'production') {
  globalForDb._pgClient = client
}

export const db = drizzle(client, { schema })
