import 'server-only'
import Redis from 'ioredis'

const globalForRedis = globalThis as unknown as {
  _redisClient: Redis | undefined
}

function createRedisClient(): Redis {
  if (!process.env.REDIS_URL) throw new Error('REDIS_URL is not set')
  const client = new Redis(process.env.REDIS_URL)
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
