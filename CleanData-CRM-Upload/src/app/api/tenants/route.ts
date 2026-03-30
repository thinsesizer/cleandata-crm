import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { createClient } from '../../../lib/supabase/server'

const prisma = new PrismaClient()

export async function POST(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, slug } = await req.json()

    // Validate slug format
    const validSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-')

    // Create tenant
    const tenant = await prisma.tenant.create({
      data: {
        name,
        slug: validSlug,
        plan: 'starter',
        maxContacts: 1000,
      },
    })

    // Update user with tenant
    await prisma.user.update({
      where: { id: user.id },
      data: { tenantId: tenant.id },
    })

    return NextResponse.json({ tenant }, { status: 201 })
  } catch (error: any) {
    console.error('Create tenant error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create tenant' },
      { status: 500 }
    )
  }
}