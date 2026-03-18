import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export interface MatchResult {
  contactId: string
  matchedContactId: string
  score: number
  reasons: string[]
}

export interface DeduplicationResult {
  processed: number
  duplicatesFound: number
  matches: MatchResult[]
}

export class DeduplicationService {
  private tenantId: string
  private threshold = 0.85 // Match threshold

  constructor(tenantId: string) {
    this.tenantId = tenantId
  }

  async findDuplicates(batchSize: number = 100): Promise<DeduplicationResult> {
    const result: DeduplicationResult = {
      processed: 0,
      duplicatesFound: 0,
      matches: [],
    }

    // Get all unprocessed contacts
    const contacts = await prisma.contact.findMany({
      where: {
        tenantId: this.tenantId,
        isDuplicate: false,
      },
      take: batchSize,
    })

    result.processed = contacts.length

    for (let i = 0; i < contacts.length; i++) {
      const contact = contacts[i]

      // Compare with remaining contacts
      for (let j = i + 1; j < contacts.length; j++) {
        const other = contacts[j]

        const matchScore = this.calculateMatchScore(contact, other)

        if (matchScore.score >= this.threshold) {
          result.duplicatesFound++
          result.matches.push({
            contactId: contact.id,
            matchedContactId: other.id,
            score: matchScore.score,
            reasons: matchScore.reasons,
          })

          // Mark as potential duplicate
          await prisma.contact.update({
            where: { id: other.id },
            data: {
              isDuplicate: true,
              duplicateOfId: contact.id,
              matchScore: matchScore.score,
              matchReason: matchScore.reasons.join(', '),
            },
          })
        }
      }
    }

    return result
  }

  private calculateMatchScore(
    contact1: any,
    contact2: any
  ): { score: number; reasons: string[] } {
    let score = 0
    const reasons: string[] = []

    // Email exact match (strong signal)
    if (contact1.email && contact2.email) {
      if (contact1.email.toLowerCase() === contact2.email.toLowerCase()) {
        score += 0.5
        reasons.push('Email exact match')
      }
    }

    // Name similarity
    const name1 = `${contact1.firstName || ''} ${contact1.lastName || ''}`.trim().toLowerCase()
    const name2 = `${contact2.firstName || ''} ${contact2.lastName || ''}`.trim().toLowerCase()

    if (name1 && name2) {
      const nameSimilarity = this.jaroWinkler(name1, name2)
      if (nameSimilarity > 0.85) {
        score += nameSimilarity * 0.3
        reasons.push(`Name similarity: ${Math.round(nameSimilarity * 100)}%`)
      }

      // Phonetic match (Soundex)
      if (this.soundex(name1) === this.soundex(name2)) {
        score += 0.15
        reasons.push('Phonetic name match')
      }
    }

    // Phone match
    if (contact1.phone && contact2.phone) {
      const phone1 = contact1.phone.replace(/\D/g, '')
      const phone2 = contact2.phone.replace(/\D/g, '')
      if (phone1 === phone2 && phone1.length > 6) {
        score += 0.25
        reasons.push('Phone match')
      }
    }

    // Company match
    if (contact1.company && contact2.company) {
      const companySim = this.jaroWinkler(
        contact1.company.toLowerCase(),
        contact2.company.toLowerCase()
      )
      if (companySim > 0.9) {
        score += 0.1
        reasons.push('Company match')
      }
    }

    return { score: Math.min(score, 1), reasons }
  }

  async mergeDuplicates(masterId: string, duplicateIds: string[]): Promise<void> {
    const master = await prisma.contact.findUnique({
      where: { id: masterId },
    })

    if (!master) {
      throw new Error('Master contact not found')
    }

    for (const duplicateId of duplicateIds) {
      const duplicate = await prisma.contact.findUnique({
        where: { id: duplicateId },
      })

      if (!duplicate) continue

      // Apply survivorship rules
      const mergedData = this.applySurvivorshipRules(master, duplicate)

      // Update master with merged data
      await prisma.contact.update({
        where: { id: masterId },
        data: mergedData,
      })

      // Mark duplicate as merged
      await prisma.contact.update({
        where: { id: duplicateId },
        data: {
          isDuplicate: true,
          duplicateOfId: masterId,
        },
      })
    }
  }

  private applySurvivorshipRules(master: any, duplicate: any): any {
    const merged: any = {}

    // Rule 1: Prefer non-empty values
    const fields = [
      'firstName', 'lastName', 'email', 'phone', 'mobilePhone',
      'title', 'company', 'abn', 'entityType', 'entityStatus',
      'websiteDescription',
    ]

    for (const field of fields) {
      if (!master[field] && duplicate[field]) {
        merged[field] = duplicate[field]
      }
    }

    // Rule 2: Prefer longer descriptions
    if ((duplicate.websiteDescription?.length || 0) > (master.websiteDescription?.length || 0)) {
      merged.websiteDescription = duplicate.websiteDescription
    }

    // Rule 3: Merge arrays (services, techStack)
    if (duplicate.services?.length) {
      merged.services = [...new Set([...(master.services || []), ...duplicate.services])]
    }

    if (duplicate.techStack?.length) {
      merged.techStack = [...new Set([...(master.techStack || []), ...duplicate.techStack])]
    }

    // Rule 4: Merge social links
    if (duplicate.socialLinks) {
      merged.socialLinks = { ...master.socialLinks, ...duplicate.socialLinks }
    }

    return merged
  }

  // Jaro-Winkler similarity algorithm
  private jaroWinkler(s1: string, s2: string): number {
    if (s1 === s2) return 1

    const s1Len = s1.length
    const s2Len = s2.length

    if (s1Len === 0 || s2Len === 0) return 0

    const matchDistance = Math.floor(Math.max(s1Len, s2Len) / 2) - 1
    const s1Matches = new Array(s1Len).fill(false)
    const s2Matches = new Array(s2Len).fill(false)

    let matches = 0
    let transpositions = 0

    for (let i = 0; i < s1Len; i++) {
      const start = Math.max(0, i - matchDistance)
      const end = Math.min(i + matchDistance + 1, s2Len)

      for (let j = start; j < end; j++) {
        if (s2Matches[j] || s1[i] !== s2[j]) continue
        s1Matches[i] = true
        s2Matches[j] = true
        matches++
        break
      }
    }

    if (matches === 0) return 0

    let k = 0
    for (let i = 0; i < s1Len; i++) {
      if (!s1Matches[i]) continue
      while (!s2Matches[k]) k++
      if (s1[i] !== s2[k]) transpositions++
      k++
    }

    const jaro = ((matches / s1Len) + (matches / s2Len) + ((matches - transpositions / 2) / matches)) / 3

    // Jaro-Winkler adjustment
    let prefix = 0
    for (let i = 0; i < Math.min(s1Len, s2Len, 4); i++) {
      if (s1[i] === s2[i]) prefix++
      else break
    }

    return jaro + prefix * 0.1 * (1 - jaro)
  }

  // Soundex algorithm for phonetic matching
  private soundex(str: string): string {
    const a = str.toLowerCase().split('')
    const f = a.shift() || ''
    let r = ''
    const codes = {
      a: '', e: '', i: '', o: '', u: '', y: '',
      b: 1, f: 1, p: 1, v: 1,
      c: 2, g: 2, j: 2, k: 2, q: 2, s: 2, x: 2, z: 2,
      d: 3, t: 3,
      l: 4,
      m: 5, n: 5,
      r: 6,
    }

    r = f + a
      .map((c) => codes[c as keyof typeof codes] || '')
      .filter((c, i, arr) => c !== arr[i - 1])
      .join('')

    return (r + '000').slice(0, 4).toUpperCase()
  }
}