import { NextResponse } from 'next/server'
import { createClient } from '../../../lib/supabase/server'
import { PrismaClient } from '@prisma/client'
import { 
  scheduleABNLookup, 
  scheduleWebsiteScrape, 
  scheduleDeduplication,
  scheduleSalesforceSync,
  scheduleBulkEnrichment 
} from '@/src/lib/queue/jobs'

const prisma = new PrismaClient()

// Start enrichment job
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

    const body = await req.json()
    const { type, contactId, contactIds, batchSize = 100 } = body

    let jobId: string

    switch (type) {
      case 'abn_lookup':
        if (!contactId) {
          return NextResponse.json({ error: 'Contact ID required' }, { status: 400 })
        }
        jobId = await scheduleABNLookup(contactId, dbUser.tenantId)
        break

      case 'website_scrape':
        if (!contactId) {
          return NextResponse.json({ error: 'Contact ID required' }, { status: 400 })
        }
        jobId = await scheduleWebsiteScrape(contactId, dbUser.tenantId)
        break

      case 'bulk_abn':
        if (!contactIds || !Array.isArray(contactIds)) {
          return NextResponse.json({ error: 'Contact IDs array required' }, { status: 400 })
        }
        const abnJobIds = await scheduleBulkEnrichment(dbUser.tenantId, contactIds, 'abn')
        return NextResponse.json({ jobIds: abnJobIds, type: 'bulk' })

      case 'bulk_website':
        if (!contactIds || !Array.isArray(contactIds)) {
          return NextResponse.json({ error: 'Contact IDs array required' }, { status: 400 })
        }
        const websiteJobIds = await scheduleBulkEnrichment(dbUser.tenantId, contactIds, 'website')
        return NextResponse.json({ jobIds: websiteJobIds, type: 'bulk' })

      case 'deduplication':
        jobId = await scheduleDeduplication(dbUser.tenantId, batchSize)
        break

      case 'salesforce_sync':
        jobId = await scheduleSalesforceSync(dbUser.tenantId, batchSize)
        break

      default:
        return NextResponse.json({ error: 'Invalid job type' }, { status: 400 })
    }

    return NextResponse.json({ jobId, type })
  } catch (error: any) {
    console.error('Create job error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

// Get job status
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

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')

    const where: any = {
      tenantId: dbUser.tenantId,
    }

    if (status) {
      where.status = status
    }

    const jobs = await prisma.enrichmentJob.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    return NextResponse.json({ jobs })
  } catch (error: any) {
    console.error('Get jobs error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}