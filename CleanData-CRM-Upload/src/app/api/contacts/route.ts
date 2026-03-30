import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { createClient } from '../../../lib/supabase/server'

const prisma = new PrismaClient()

export async function GET(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's tenant
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { tenantId: true },
    })

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Parse query params
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const enriched = searchParams.get('enriched')
    const duplicates = searchParams.get('duplicates')

    const where: any = {
      tenantId: dbUser.tenantId,
    }

    // Search filter
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Enrichment filter
    if (enriched === 'true') {
      where.enrichedAt = { not: null }
    } else if (enriched === 'false') {
      where.enrichedAt = null
    }

    // Duplicates filter
    if (duplicates === 'true') {
      where.isDuplicate = true
    }

    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.contact.count({ where }),
    ])

    return NextResponse.json({
      contacts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error: any) {
    console.error('Get contacts error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}