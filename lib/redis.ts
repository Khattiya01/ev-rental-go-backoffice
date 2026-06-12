import 'server-only'
import Redis from 'ioredis'

const globalForRedis = globalThis as unknown as {
  _redisClient: Redis | undefined
}

function createRedisClient(): Redis {
  if (!process.env.REDIS_URL) throw new Error('REDIS_URL is not set')
  const client = new Redis(process.env.REDIS_URL, {
    // Fail fast when Redis is down — never let a request hang on a dead socket.
    // Without these, ioredis buffers commands in an offline queue and the
    // awaiting request blocks until the connection (eventually) recovers.
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    connectTimeout: 3_000,
    retryStrategy: (times) => Math.min(times * 200, 2_000), // reconnect in background
  })
  client.on('error', (err) => console.error('[Redis] connection error:', err))
  return client
}

const redis = globalForRedis._redisClient ?? createRedisClient()

if (process.env.NODE_ENV !== 'production') {
  globalForRedis._redisClient = redis
}

export function getRedisClient(): Redis {
  return redis
}
