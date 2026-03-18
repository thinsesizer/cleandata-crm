import { Redis } from '@upstash/redis'
import crypto from 'crypto'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

// Cache TTLs in seconds
const CACHE_TTLS = {
  CONTACT: 300,        // 5 minutes
  QUERY: 60,           // 1 minute
  METADATA: 3600,      // 1 hour
  DESCRIBE: 86400,     // 24 hours
}

export class SalesforceCache {
  private tenantId: string

  constructor(tenantId: string) {
    this.tenantId = tenantId
  }

  private getKey(type: string, identifier: string): string {
    return `sf:${this.tenantId}:${type}:${identifier}`
  }

  private generateHash(data: any): string {
    return crypto
      .createHash('md5')
      .update(JSON.stringify(data))
      .digest('hex')
  }

  // Contact caching
  async getContact(salesforceId: string): Promise<any | null> {
    const key = this.getKey('contact', salesforceId)
    const cached = await redis.get(key)
    return cached ? JSON.parse(cached as string) : null
  }

  async setContact(salesforceId: string, data: any): Promise<void> {
    const key = this.getKey('contact', salesforceId)
    await redis.setex(key, CACHE_TTLS.CONTACT, JSON.stringify(data))
  }

  async invalidateContact(salesforceId: string): Promise<void> {
    const key = this.getKey('contact', salesforceId)
    await redis.del(key)
  }

  // Query result caching
  async getQuery(query: string): Promise<any | null> {
    const hash = this.generateHash(query)
    const key = this.getKey('query', hash)
    const cached = await redis.get(key)
    return cached ? JSON.parse(cached as string) : null
  }

  async setQuery(query: string, results: any): Promise<void> {
    const hash = this.generateHash(query)
    const key = this.getKey('query', hash)
    await redis.setex(key, CACHE_TTLS.QUERY, JSON.stringify(results))
  }

  // Metadata caching
  async getObjectMetadata(objectType: string): Promise<any | null> {
    const key = this.getKey('metadata', objectType)
    const cached = await redis.get(key)
    return cached ? JSON.parse(cached as string) : null
  }

  async setObjectMetadata(objectType: string, metadata: any): Promise<void> {
    const key = this.getKey('metadata', objectType)
    await redis.setex(key, CACHE_TTLS.METADATA, JSON.stringify(metadata))
  }

  // Describe caching
  async getDescribe(objectType: string): Promise<any | null> {
    const key = this.getKey('describe', objectType)
    const cached = await redis.get(key)
    return cached ? JSON.parse(cached as string) : null
  }

  async setDescribe(objectType: string, describe: any): Promise<void> {
    const key = this.getKey('describe', objectType)
    await redis.setex(key, CACHE_TTLS.DESCRIBE, JSON.stringify(describe))
  }

  // Bulk invalidation
  async invalidatePattern(pattern: string): Promise<void> {
    const keys = await redis.keys(`sf:${this.tenantId}:${pattern}:*`)
    if (keys.length > 0) {
      await redis.del(...keys)
    }
  }

  // Cache statistics
  async getStats(): Promise<{
    hits: number
    misses: number
    hitRate: number
  }> {
    const hits = await redis.get(`stats:${this.tenantId}:cache:hits`) || 0
    const misses = await redis.get(`stats:${this.tenantId}:cache:misses`) || 0
    const total = (hits as number) + (misses as number)
    
    return {
      hits: hits as number,
      misses: misses as number,
      hitRate: total > 0 ? ((hits as number) / total) * 100 : 0,
    }
  }

  async recordHit(): Promise<void> {
    await redis.incr(`stats:${this.tenantId}:cache:hits`)
  }

  async recordMiss(): Promise<void> {
    await redis.incr(`stats:${this.tenantId}:cache:misses`)
  }
}

// Cached query wrapper
export async function cachedQuery(
  tenantId: string,
  query: string,
  fetchFn: () => Promise<any>
): Promise<any> {
  const cache = new SalesforceCache(tenantId)
  
  // Try cache first
  const cached = await cache.getQuery(query)
  if (cached) {
    await cache.recordHit()
    return cached
  }

  await cache.recordMiss()
  
  // Fetch fresh data
  const results = await fetchFn()
  
  // Cache results
  await cache.setQuery(query, results)
  
  return results
}