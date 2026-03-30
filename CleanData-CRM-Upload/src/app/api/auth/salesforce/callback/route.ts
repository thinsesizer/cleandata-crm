import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import jsforce from 'jsforce'
import { createClient } from '../../../../lib/supabase/server'

const prisma = new PrismaClient()

const oauth2 = new jsforce.OAuth2({
  loginUrl: 'https://login.salesforce.com',
  clientId: process.env.SALESFORCE_CLIENT_ID!,
  clientSecret: process.env.SALESFORCE_CLIENT_SECRET!,
  redirectUri: process.env.SALESFORCE_REDIRECT_URI!,
})

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  if (error) {
    console.error('Salesforce OAuth error:', error, errorDescription)
    return NextResponse.redirect(
      new URL('/dashboard/settings?error=salesforce_auth_failed', process.env.NEXT_PUBLIC_APP_URL)
    )
  }

  if (!code) {
    return NextResponse.redirect(
      new URL('/dashboard/settings?error=no_code', process.env.NEXT_PUBLIC_APP_URL)
    )
  }

  try {
    // Get current user
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.redirect(
        new URL('/login?error=not_authenticated', process.env.NEXT_PUBLIC_APP_URL)
      )
    }

    // Get user's tenant
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { tenant: true },
    })

    if (!dbUser) {
      throw new Error('User not found in database')
    }

    // Exchange code for tokens
    const conn = new jsforce.Connection({ oauth2 })
    const userInfo = await conn.authorize(code)

    // Store connection
    await prisma.salesforceConnection.upsert({
      where: {
        tenantId: dbUser.tenantId,
      },
      update: {
        instanceUrl: conn.instanceUrl,
        accessToken: conn.accessToken,
        refreshToken: conn.refreshToken,
        issuedAt: new Date(),
        isActive: true,
      },
      create: {
        tenantId: dbUser.tenantId,
        instanceUrl: conn.instanceUrl,
        accessToken: conn.accessToken,
        refreshToken: conn.refreshToken,
        issuedAt: new Date(),
        isActive: true,
      },
    })

    // Start initial sync (async)
    // This would queue a background job in production
    console.log('Salesforce connected, starting initial sync...')

    return NextResponse.redirect(
      new URL('/dashboard/settings?success=salesforce_connected', process.env.NEXT_PUBLIC_APP_URL)
    )
  } catch (error) {
    console.error('Salesforce OAuth callback error:', error)
    return NextResponse.redirect(
      new URL('/dashboard/settings?error=salesforce_connection_failed', process.env.NEXT_PUBLIC_APP_URL)
    )
  }
}