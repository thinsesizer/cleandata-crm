import jsforce from 'jsforce'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export interface SalesforceContact {
  Id: string
  FirstName?: string
  LastName?: string
  Email?: string
  Phone?: string
  MobilePhone?: string
  Title?: string
  Account?: {
    Id: string
    Name: string
  }
  AccountId?: string
  CreatedDate: string
  LastModifiedDate: string
}

export interface SyncResult {
  synced: number
  created: number
  updated: number
  errors: string[]
}

export class SalesforceService {
  private conn: jsforce.Connection | null = null
  private tenantId: string

  constructor(tenantId: string) {
    this.tenantId = tenantId
  }

  async connect(): Promise<boolean> {
    const connection = await prisma.salesforceConnection.findUnique({
      where: { tenantId: this.tenantId },
    })

    if (!connection || !connection.isActive) {
      return false
    }

    // Check if token needs refresh
    const tokenExpired = connection.expiresAt && new Date() > connection.expiresAt

    if (tokenExpired) {
      await this.refreshToken(connection.refreshToken)
    }

    this.conn = new jsforce.Connection({
      instanceUrl: connection.instanceUrl,
      accessToken: connection.accessToken,
    })

    // Test connection
    try {
      await this.conn.identity()
      return true
    } catch (error) {
      console.error('Salesforce connection test failed:', error)
      return false
    }
  }

  private async refreshToken(refreshToken: string): Promise<void> {
    const oauth2 = new jsforce.OAuth2({
      loginUrl: 'https://login.salesforce.com',
      clientId: process.env.SALESFORCE_CLIENT_ID!,
      clientSecret: process.env.SALESFORCE_CLIENT_SECRET!,
    })

    const conn = new jsforce.Connection({ oauth2 })
    const result = await conn.oauth2.refreshToken(refreshToken)

    await prisma.salesforceConnection.update({
      where: { tenantId: this.tenantId },
      data: {
        accessToken: result.access_token,
        issuedAt: new Date(),
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours
      },
    })
  }

  async syncContacts(batchSize: number = 200): Promise<SyncResult> {
    if (!this.conn) {
      throw new Error('Not connected to Salesforce')
    }

    const result: SyncResult = {
      synced: 0,
      created: 0,
      updated: 0,
      errors: [],
    }

    try {
      // Query all contacts with accounts
      const query = `
        SELECT Id, FirstName, LastName, Email, Phone, MobilePhone, Title, AccountId, Account.Name, CreatedDate, LastModifiedDate
        FROM Contact
        WHERE IsDeleted = false
        ORDER BY LastModifiedDate DESC
      `

      let records: SalesforceContact[] = []
      let hasMore = true
      let offset = 0

      while (hasMore) {
        const batchQuery = `${query} LIMIT ${batchSize} OFFSET ${offset}`
        const response = await this.conn.query<SalesforceContact>(batchQuery)
        
        records = response.records
        hasMore = records.length === batchSize
        offset += batchSize

        for (const record of records) {
          try {
            await this.upsertContact(record)
            result.synced++
          } catch (error: any) {
            result.errors.push(`Failed to sync ${record.Id}: ${error.message}`)
          }
        }
      }

      // Update last sync time
      await prisma.salesforceConnection.update({
        where: { tenantId: this.tenantId },
        data: { lastSyncAt: new Date() },
      })

      return result
    } catch (error: any) {
      console.error('Sync error:', error)
      throw error
    }
  }

  private async upsertContact(record: SalesforceContact): Promise<void> {
    const existing = await prisma.contact.findUnique({
      where: {
        tenantId_salesforceId: {
          tenantId: this.tenantId,
          salesforceId: record.Id,
        },
      },
    })

    const contactData = {
      tenantId: this.tenantId,
      salesforceId: record.Id,
      firstName: record.FirstName || null,
      lastName: record.LastName || null,
      email: record.Email || null,
      phone: record.Phone || null,
      mobilePhone: record.MobilePhone || null,
      title: record.Title || null,
      company: record.Account?.Name || null,
      accountId: record.AccountId || null,
      lastSyncedAt: new Date(),
    }

    if (existing) {
      await prisma.contact.update({
        where: { id: existing.id },
        data: contactData,
      })
    } else {
      await prisma.contact.create({
        data: contactData,
      })
    }
  }

  async getContactCount(): Promise<number> {
    if (!this.conn) {
      throw new Error('Not connected to Salesforce')
    }

    const result = await this.conn.query('SELECT COUNT() FROM Contact WHERE IsDeleted = false')
    return result.totalSize
  }

  async disconnect(): Promise<void> {
    await prisma.salesforceConnection.update({
      where: { tenantId: this.tenantId },
      data: { isActive: false },
    })
    this.conn = null
  }
}