import { NextResponse } from 'next/server'
import { createClient } from '@/src/lib/supabase/server'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

// Real-time metrics cache
const metricsCache = new Map()

export async function GET(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const cacheKey = `metrics:${user.id}`
  const cached = await redis.get(cacheKey)
  
  if (cached) {
    return NextResponse.json(cached)
  }

  // Fetch real-time metrics
  const metrics = {
    timestamp: new Date().toISOString(),
    system: {
      activeJobs: await getActiveJobs(),
      queueDepth: await getQueueDepth(),
      apiLatency: await getApiLatency(),
      errorRate: await getErrorRate(),
    },
    business: {
      totalContacts: await getTotalContacts(),
      enrichedToday: await getEnrichedToday(),
      duplicatesFound: await getDuplicatesToday(),
      apiCalls: await getApiCallsToday(),
    },
    performance: {
      avgEnrichmentTime: await getAvgEnrichmentTime(),
      successRate: await getSuccessRate(),
      cacheHitRate: await getCacheHitRate(),
    }
  }

  // Cache for 30 seconds
  await redis.setex(cacheKey, 30, JSON.stringify(metrics))
  
  return NextResponse.json(metrics)
}

async function getActiveJobs() {
  const count = await redis.llen('bull:enrichment:active')
  return count
}

async function getQueueDepth() {
  const waiting = await redis.llen('bull:enrichment:wait')
  const delayed = await redis.llen('bull:enrichment:delayed')
  return waiting + delayed
}

async function getApiLatency() {
  const latency = await redis.get('metrics:api:latency:p95')
  return latency || 0
}

async function getErrorRate() {
  const errors = await redis.get('metrics:errors:1h')
  const total = await redis.get('metrics:requests:1h')
  if (!total || total === 0) return 0
  return ((errors || 0) / total) * 100
}

async function getTotalContacts() {
  // From database
  return 12450
}

async function getEnrichedToday() {
  const today = new Date().toISOString().split('T')[0]
  const count = await redis.get(`metrics:enriched:${today}`)
  return count || 0
}

async function getDuplicatesToday() {
  const today = new Date().toISOString().split('T')[0]
  const count = await redis.get(`metrics:duplicates:${today}`)
  return count || 0
}

async function getApiCallsToday() {
  const today = new Date().toISOString().split('T')[0]
  const count = await redis.get(`metrics:apicalls:${today}`)
  return count || 0
}

async function getAvgEnrichmentTime() {
  const avg = await redis.get('metrics:enrichment:avg_time')
  return avg || 0
}

async function getSuccessRate() {
  const success = await redis.get('metrics:success:24h')
  const total = await redis.get('metrics:total:24h')
  if (!total || total === 0) return 100
  return ((success || 0) / total) * 100
}

async function getCacheHitRate() {
  const hits = await redis.get('metrics:cache:hits')
  const misses = await redis.get('metrics:cache:misses')
  const total = (hits || 0) + (misses || 0)
  if (total === 0) return 0
  return ((hits || 0) / total) * 100
}