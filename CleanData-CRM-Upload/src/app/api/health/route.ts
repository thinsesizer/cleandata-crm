import { NextResponse } from 'next/server'

const ALLOWED_IPS = process.env.HEALTH_CHECK_IPS?.split(',') || []
const SECRET = process.env.HEALTH_CHECK_SECRET

const checks = [
  {
    name: 'Database',
    check: async () => {
      try {
        const res = await fetch(`${process.env.POSTGRES_URL}/health`)
        return res.ok
      } catch (e) {
        return false
      }
    }
  },
  {
    name: 'Redis',
    check: async () => {
      try {
        const response = await fetch(`${process.env.REDIS_URL}/ping`)
        return response.status === 200
      } catch (e) {
        return false
      }
    }
  },
  {
    name: 'Queue',
    check: async () => {
      try {
        return true // Implement actual queue health check
      } catch (e) {
        return false
      }
    }
  }
]

export async function GET(request: Request) {
  const ip = request.headers.get('x-forwarded-for')
  const secret = new URL(request.url).searchParams.get('secret')
  
  // IP allowlist
  if (ALLOWED_IPS.length > 0 && !ALLOWED_IPS.includes(ip || '')) {
    return new NextResponse('Unauthorized', { status: 403 })
  }
  
  // Secret check
  if (SECRET && secret !== SECRET) {
    return new NextResponse('Unauthorized', { status: 401 })
  }
  
  const results = await Promise.all(
    checks.map(async (check) => ({
      name: check.name,
      status: await check.check()
    }))
  )
  
  const healthy = results.every(r => r.status)
  
  return NextResponse.json({
    status: healthy ? 'healthy' : 'degraded',
    checks: results,
    version: process.env.NEXT_PUBLIC_APP_VERSION,
    time: new Date().toISOString(),
    commit: process.env.VERCEL_GIT_COMMIT_SHA || 'local'
  }, {
    status: healthy ? 200 : 503
  })
}