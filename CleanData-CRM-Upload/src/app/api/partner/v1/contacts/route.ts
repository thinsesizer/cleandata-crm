import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { createClient } from '../../../../../lib/supabase/server'
import crypto from 'crypto'

const prisma = new PrismaClient()

// Webhook event types
export type WebhookEvent = 
  | 'contact.created'
  | 'contact.updated'
  | 'contact.enriched'
  | 'contact.duplicate_detected'
  | 'contact.merged'
  | 'enrichment.completed'
  | 'enrichment.failed'

interface WebhookPayload {
  event: WebhookEvent
  timestamp: string
  data: any
}

// Register a new webhook
export async function POST(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { tenantId: true },
    })

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { url, events, secret } = await req.json()

    // Validate URL
    try {
      new URL(url)
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
    }

    // Generate signing secret if not provided
    const signingSecret = secret || crypto.randomBytes(32).toString('hex')

    // Store webhook
    const webhook = await prisma.webhook.create({
      data: {
        tenantId: dbUser.tenantId,
        url,
        events: events || ['*'],
        secret: signingSecret,
        isActive: true,
      },
    })

    return NextResponse.json({
      id: webhook.id,
      url: webhook.url,
      events: webhook.events,
      secret: signingSecret, // Only shown once
      createdAt: webhook.createdAt,
    }, { status: 201 })
  } catch (error: any) {
    console.error('Create webhook error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// List webhooks
export async function GET(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { tenantId: true },
    })

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const webhooks = await prisma.webhook.findMany({
      where: { tenantId: dbUser.tenantId },
      select: {
        id: true,
        url: true,
        events: true,
        isActive: true,
        lastTriggeredAt: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ webhooks })
  } catch (error: any) {
    console.error('List webhooks error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Webhook delivery service
export class WebhookService {
  private async signPayload(payload: string, secret: string): Promise<string> {
    return crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex')
  }

  async deliver(
    webhook: { url: string; secret: string },
    payload: WebhookPayload
  ): Promise<{ success: boolean; statusCode?: number; error?: string }> {
    const body = JSON.stringify(payload)
    const signature = await this.signPayload(body, webhook.secret)

    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': `sha256=${signature}`,
          'X-Webhook-Timestamp': payload.timestamp,
          'User-Agent': 'CleanData-Webhook/1.0',
        },
        body,
      })

      return {
        success: response.ok,
        statusCode: response.status,
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      }
    }
  }

  async triggerEvent(
    tenantId: string,
    event: WebhookEvent,
    data: any
  ): Promise<void> {
    const webhooks = await prisma.webhook.findMany({
      where: {
        tenantId,
        isActive: true,
        OR: [
          { events: { has: '*' } },
          { events: { has: event } },
        ],
      },
    })

    const payload: WebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      data,
    }

    // Deliver to all matching webhooks
    await Promise.all(
      webhooks.map(async (webhook) => {
        const result = await this.deliver(webhook, payload)

        // Update webhook stats
        await prisma.webhook.update({
          where: { id: webhook.id },
          data: {
            lastTriggeredAt: new Date(),
            ...(result.success
              ? { successCount: { increment: 1 } }
              : { failureCount: { increment: 1 } }),
          },
        })

        // Store delivery attempt
        await prisma.webhookDelivery.create({
          data: {
            webhookId: webhook.id,
            event,
            payload: payload as any,
            success: result.success,
            statusCode: result.statusCode,
            error: result.error,
          },
        })
      })
    )
  }
}
