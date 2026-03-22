import axios from 'axios'
import * as cheerio from 'cheerio'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export interface WebsiteData {
  url: string
  title: string
  description: string
  socialLinks: {
    linkedin?: string
    twitter?: string
    facebook?: string
    instagram?: string
  }
  services: string[]
  techStack: string[]
  confidence: number
}

export interface ScrapingResult {
  success: boolean
  data?: WebsiteData
  error?: string
}

export class WebsiteScraperService {
  private readonly timeout = 15000
  private readonly maxContentLength = 5 * 1024 * 1024 // 5MB

  async scrapeWebsite(url: string): Promise<ScrapingResult> {
    try {
      // Normalize URL
      let normalizedUrl = url
      if (!url.startsWith('http')) {
        normalizedUrl = `https://${url}`
      }

      // Remove trailing slash
      normalizedUrl = normalizedUrl.replace(/\/$/, '')

      const response = await axios.get(normalizedUrl, {
        timeout: this.timeout,
        maxContentLength: this.maxContentLength,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
        validateStatus: (status) => status < 400,
      })

      const html = response.data
      const $ = cheerio.load(html)

      const websiteData: WebsiteData = {
        url: normalizedUrl,
        title: this.extractTitle($),
        description: this.extractDescription($),
        socialLinks: this.extractSocialLinks($, normalizedUrl),
        services: this.extractServices($),
        techStack: this.detectTechStack($, html),
        confidence: 0.85,
      }

      return {
        success: true,
        data: websiteData,
      }
    } catch (error: any) {
      console.error('Website scraping error:', error.message)
      return {
        success: false,
        error: error.message,
      }
    }
  }

  async enrichContact(contactId: string): Promise<ScrapingResult> {
    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
    })

    if (!contact) {
      return { success: false, error: 'Contact not found' }
    }

    if (!contact.company) {
      return { success: false, error: 'No company name available' }
    }

    // Try common URL patterns
    const urlsToTry = [
      `https://www.${this.domainFromCompany(contact.company)}.com.au`,
      `https://www.${this.domainFromCompany(contact.company)}.com`,
      `https://${this.domainFromCompany(contact.company)}.com.au`,
      `https://${this.domainFromCompany(contact.company)}.com`,
    ]

    for (const url of urlsToTry) {
      const result = await this.scrapeWebsite(url)
      
      if (result.success && result.data) {
        // Update contact with website data
        await prisma.contact.update({
          where: { id: contactId },
          data: {
            websiteDescription: result.data.description,
            socialLinks: result.data.socialLinks,
            services: result.data.services,
            techStack: result.data.techStack,
            enrichedAt: new Date(),
            enrichmentSource: 'website_scrape',
            enrichmentScore: result.data.confidence,
          },
        })

        return result
      }
    }

    return { success: false, error: 'Could not fetch website data' }
  }

  private extractTitle($: cheerio.CheerioAPI): string {
    return $('title').text().trim() || ''
  }

  private extractDescription($: cheerio.CheerioAPI): string {
    // Try meta description
    let description = $('meta[name="description"]').attr('content') ||
                      $('meta[property="og:description"]').attr('content') ||
                      $('meta[name="twitter:description"]').attr('content')

    if (description) return description.trim()

    // Fallback to first paragraph
    const firstPara = $('p').first().text().trim()
    if (firstPara && firstPara.length > 50) {
      return firstPara.substring(0, 300)
    }

    return ''
  }

  private extractSocialLinks($: cheerio.CheerioAPI, baseUrl: string): WebsiteData['socialLinks'] {
    const links: WebsiteData['socialLinks'] = {}

    $('a[href]').each((_, elem) => {
      const href = $(elem).attr('href') || ''
      
      if (href.includes('linkedin.com')) {
        links.linkedin = href.startsWith('http') ? href : `${baseUrl}${href}`
      } else if (href.includes('twitter.com') || href.includes('x.com')) {
        links.twitter = href.startsWith('http') ? href : `${baseUrl}${href}`
      } else if (href.includes('facebook.com')) {
        links.facebook = href.startsWith('http') ? href : `${baseUrl}${href}`
      } else if (href.includes('instagram.com')) {
        links.instagram = href.startsWith('http') ? href : `${baseUrl}${href}`
      }
    })

    return links
  }

  private extractServices($: cheerio.CheerioAPI): string[] {
    const services: string[] = []
    const serviceKeywords = [
      'consulting', 'software', 'development', 'design', 'marketing',
      'sales', 'support', 'training', 'implementation', 'integration',
      'cloud', 'hosting', 'security', 'analytics', 'automation',
    ]

    const text = $('body').text().toLowerCase()
    
    for (const keyword of serviceKeywords) {
      if (text.includes(keyword)) {
        services.push(keyword)
      }
    }

    return [...new Set(services)].slice(0, 10)
  }

  private detectTechStack($: cheerio.CheerioAPI, html: string): string[] {
    const techStack: string[] = []
    const indicators = {
      'WordPress': html.includes('wp-content'),
      'Shopify': html.includes('shopify'),
      'React': html.includes('reactroot') || html.includes('data-reactroot'),
      'Next.js': html.includes('__NEXT_DATA__'),
      'Vue.js': html.includes('__VUE__'),
      'Angular': html.includes('ng-') || html.includes('angular'),
      'Google Analytics': html.includes('google-analytics') || html.includes('gtag'),
      'Hotjar': html.includes('hotjar'),
      'Intercom': html.includes('intercom'),
      'HubSpot': html.includes('hubspot'),
    }

    for (const [tech, detected] of Object.entries(indicators)) {
      if (detected) {
        techStack.push(tech)
      }
    }

    // Check for tracking scripts
    $('script[src]').each((_, elem) => {
      const src = $(elem).attr('src') || ''
      if (src.includes('googletagmanager')) techStack.push('Google Tag Manager')
      if (src.includes('facebook')) techStack.push('Facebook Pixel')
    })

    return [...new Set(techStack)]
  }

  private domainFromCompany(company: string): string {
    return company
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[^a-z0-9]/g, '')
      .replace(/(pty|ltd|limited|inc|corp|co)$/i, '')
  }
}