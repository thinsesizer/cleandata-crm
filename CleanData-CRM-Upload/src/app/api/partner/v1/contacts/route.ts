import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const prisma = new PrismaClient()
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

// Rate limiting for partner API
const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(1000, '1 h'), // 1000 requests per hour
})

// API key authentication middleware
async function authenticatePartner(req: Request): Promise<{ tenantId: string; partnerId: string } | null> {
  const apiKey = req.headers.get('x-api-key')
  
  if (!apiKey) {
    return null
  }

  const partner = await prisma.partner.findUnique({
    where: { apiKey },
    select: { id: true, tenantId: true, isActive: true },
  })

  if (!partner || !partner.isActive) {
    return null
  }

  return { tenantId: partner.tenantId, partnerId: partner.id }
}

// Partner API - Get contacts
export async function GET(req: Request) {
  try {
    // Check rate limit
    const identifier = req.headers.get('x-api-key') || 'anonymous'
    const { success } = await ratelimit.limit(identifier)

    if (!success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      )
    }

    // Authenticate
    const auth = await authenticatePartner(req)
    if (!auth) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(req.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 1000)
    const offset = parseInt(searchParams.get('offset') || '0')
    const enriched = searchParams.get('enriched')

    const where: any = {
      tenantId: auth.tenantId,
    }

    if (enriched === 'true') {
      where.enrichedAt = { not: null }
    } else if (enriched === 'false') {
      where.enrichedAt = null
    }

    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          salesforceId: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          company: true,
          title: true,
          abn: true,
          entityType: true,
          gstRegistered: true,
          enrichedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.contact.count({ where }),
    ])

    return NextResponse.json({
      data: contacts,
      meta: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    })
  } catch (error: any) {
    console.error('Partner API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Partner API - Create contact
export async function POST(req: Request) {
  try {
    const identifier = req.headers.get('x-api-key') || 'anonymous'
    const { success } = await ratelimit.limit(identifier)

    if (!success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      )
    }

    const auth = await authenticatePartner(req)
    if (!auth) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      )
    }

    const body = await req.json()

    // Validate required fields
    if (!body.email && !body.firstName && !body.lastName) {
      return NextResponse.json(
        { error: 'At least one identifier required (email, firstName, or lastName)' },
        { status: 400 }
      )
    }

    const contact = await prisma.contact.create({
      data: {
        tenantId: auth.tenantId,
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
        phone: body.phone,
        company: body.company,
        title: body.title,
      },
    })

    // Trigger webhook
    const { WebhookService } = await import('../webhooks/route')
    const webhookService = new WebhookService()
    await webhookService.triggerEvent(auth.tenantId, 'contact.created', contact)

    return NextResponse.json({ data: contact }, { status: 201 })
  } catch (error: any) {
    console.error('Partner API error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}