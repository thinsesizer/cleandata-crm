import axios from 'axios'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export interface ABNLookupResult {
  abn: string
  entityType: string
  entityStatus: string
  gstRegistered: boolean
  businessName: string
  mainBusinessLocation: string
  registrationDate: Date | null
  lastUpdated: Date | null
  confidence: number
}

export interface EnrichmentResult {
  success: boolean
  data?: ABNLookupResult
  error?: string
}

export class ABNLookupService {
  private apiUrl = 'https://abr.business.gov.au/json/AbnDetails.aspx'
  private guid = process.env.ABN_LOOKUP_GUID || 'YOUR-GUID-HERE'

  async lookupABN(abn: string): Promise<EnrichmentResult> {
    try {
      // Clean ABN (remove spaces)
      const cleanAbn = abn.replace(/\s/g, '')

      // Validate ABN format
      if (!this.validateABN(cleanAbn)) {
        return { success: false, error: 'Invalid ABN format' }
      }

      const response = await axios.get(this.apiUrl, {
        params: {
          abn: cleanAbn,
          guid: this.guid,
        },
        timeout: 10000,
      })

      const data = response.data

      if (data.Message) {
        return { success: false, error: data.Message }
      }

      return {
        success: true,
        data: {
          abn: cleanAbn,
          entityType: data.EntityType || 'Unknown',
          entityStatus: data.EntityStatus || 'Unknown',
          gstRegistered: data.Gst === 'Y',
          businessName: data.EntityName || data.BusinessName || '',
          mainBusinessLocation: data.MainBusinessLocation || '',
          registrationDate: data.AbnStatusFromDate ? new Date(data.AbnStatusFromDate) : null,
          lastUpdated: data.ASICNumber ? new Date() : null,
          confidence: 0.95,
        },
      }
    } catch (error: any) {
      console.error('ABN Lookup error:', error)
      return { success: false, error: error.message }
    }
  }

  async searchByName(name: string): Promise<EnrichmentResult> {
    try {
      // Try to find ABN by company name
      const searchUrl = 'https://abr.business.gov.au/json/MatchingNames.aspx'
      
      const response = await axios.get(searchUrl, {
        params: {
          name: name,
          guid: this.guid,
          maxResults: 5,
        },
        timeout: 10000,
      })

      const data = response.data

      if (!data.Names || data.Names.length === 0) {
        return { success: false, error: 'No matching ABN found' }
      }

      // Take first match with highest score
      const bestMatch = data.Names[0]
      
      return this.lookupABN(bestMatch.Abn)
    } catch (error: any) {
      console.error('ABN Search error:', error)
      return { success: false, error: error.message }
    }
  }

  async enrichContact(contactId: string): Promise<EnrichmentResult> {
    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
    })

    if (!contact) {
      return { success: false, error: 'Contact not found' }
    }

    let result: EnrichmentResult

    // If contact has ABN, lookup directly
    if (contact.abn) {
      result = await this.lookupABN(contact.abn)
    } 
    // Otherwise try to search by company name
    else if (contact.company) {
      result = await this.searchByName(contact.company)
    } else {
      return { success: false, error: 'No ABN or company name available' }
    }

    if (result.success && result.data) {
      // Update contact with enrichment data
      await prisma.contact.update({
        where: { id: contactId },
        data: {
          abn: result.data.abn,
          entityType: result.data.entityType,
          entityStatus: result.data.entityStatus,
          gstRegistered: result.data.gstRegistered,
          businessAddress: result.data.mainBusinessLocation,
          registrationDate: result.data.registrationDate,
          enrichedAt: new Date(),
          enrichmentSource: 'abn_lookup',
          enrichmentScore: result.data.confidence,
        },
      })
    }

    return result
  }

  validateABN(abn: string): boolean {
    // Remove spaces
    const cleanAbn = abn.replace(/\s/g, '')

    // Must be 11 digits
    if (!/^\d{11}$/.test(cleanAbn)) {
      return false
    }

    // ABN validation algorithm
    const weights = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19]
    const digits = cleanAbn.split('').map(Number)

    // Subtract 1 from first digit
    digits[0] = digits[0] - 1

    let sum = 0
    for (let i = 0; i < 11; i++) {
      sum += digits[i] * weights[i]
    }

    return sum % 89 === 0
  }

  formatABN(abn: string): string {
    const clean = abn.replace(/\s/g, '')
    return clean.replace(/(\d{2})(\d{3})(\d{3})(\d{3})/, '$1 $2 $3 $4')
  }
}