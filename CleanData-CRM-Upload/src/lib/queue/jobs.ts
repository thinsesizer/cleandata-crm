import Queue from 'bull'
import { PrismaClient } from '@prisma/client'
import { SalesforceService } from './salesforce'
import { ABNLookupService } from './abn-lookup'
import { WebsiteScraperService } from './website-scraper'
import { DeduplicationService } from './deduplication'

const prisma = new PrismaClient()

// Redis connection
const redisConfig = {
  redis: {
    port: parseInt(process.env.REDIS_PORT || '6379'),
    host: process.env.REDIS_HOST || 'localhost',
    password: process.env.REDIS_PASSWORD,
  },
}

// Job queues
export const enrichmentQueue = new Queue('enrichment', redisConfig)
export const deduplicationQueue = new Queue('deduplication', redisConfig)
export const syncQueue = new Queue('salesforce-sync', redisConfig)

// Job processors
enrichmentQueue.process('abn-lookup', 5, async (job) => {
  const { contactId, tenantId } = job.data
  
  const service = new ABNLookupService()
  const result = await service.enrichContact(contactId)
  
  if (!result.success) {
    throw new Error(result.error)
  }
  
  return result.data
})

enrichmentQueue.process('website-scrape', 3, async (job) => {
  const { contactId } = job.data
  
  const service = new WebsiteScraperService()
  const result = await service.enrichContact(contactId)
  
  if (!result.success) {
    throw new Error(result.error)
  }
  
  return result.data
})

deduplicationQueue.process('find-duplicates', 1, async (job) => {
  const { tenantId, batchSize } = job.data
  
  const service = new DeduplicationService(tenantId)
  const result = await service.findDuplicates(batchSize)
  
  return result
})

syncQueue.process('sync-contacts', 2, async (job) => {
  const { tenantId, batchSize } = job.data
  
  const service = new SalesforceService(tenantId)
  const connected = await service.connect()
  
  if (!connected) {
    throw new Error('Failed to connect to Salesforce')
  }
  
  const result = await service.syncContacts(batchSize)
  
  return result
})

// Job progress tracking
enrichmentQueue.on('progress', (job, progress) => {
  console.log(`Job ${job.id} progress: ${progress}%`)
})

enrichmentQueue.on('completed', async (job, result) => {
  console.log(`Job ${job.id} completed:`, result)
  
  // Update job status in database
  await prisma.enrichmentJob.update({
    where: { id: job.data.jobId },
    data: {
      status: 'completed',
      completedAt: new Date(),
      results: result,
    },
  })
})

enrichmentQueue.on('failed', async (job, err) => {
  console.error(`Job ${job.id} failed:`, err)
  
  await prisma.enrichmentJob.update({
    where: { id: job.data.jobId },
    data: {
      status: 'failed',
      errorMessage: err.message,
    },
  })
})

// Job scheduling functions
export async function scheduleABNLookup(contactId: string, tenantId: string): Promise<string> {
  // Create job record
  const jobRecord = await prisma.enrichmentJob.create({
    data: {
      tenantId,
      jobType: 'abn_lookup',
      status: 'pending',
    },
  })
  
  // Add to queue
  const job = await enrichmentQueue.add('abn-lookup', {
    contactId,
    tenantId,
    jobId: jobRecord.id,
  }, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  })
  
  // Update with queue job ID
  await prisma.enrichmentJob.update({
    where: { id: jobRecord.id },
    data: { status: 'running' },
  })
  
  return job.id as string
}

export async function scheduleWebsiteScrape(contactId: string, tenantId: string): Promise<string> {
  const jobRecord = await prisma.enrichmentJob.create({
    data: {
      tenantId,
      jobType: 'website_scrape',
      status: 'pending',
    },
  })
  
  const job = await enrichmentQueue.add('website-scrape', {
    contactId,
    tenantId,
    jobId: jobRecord.id,
  }, {
    attempts: 2,
    backoff: {
      type: 'fixed',
      delay: 5000,
    },
  })
  
  await prisma.enrichmentJob.update({
    where: { id: jobRecord.id },
    data: { status: 'running' },
  })
  
  return job.id as string
}

export async function scheduleDeduplication(tenantId: string, batchSize: number = 100): Promise<string> {
  const jobRecord = await prisma.enrichmentJob.create({
    data: {
      tenantId,
      jobType: 'deduplication',
      status: 'pending',
    },
  })
  
  const job = await deduplicationQueue.add('find-duplicates', {
    tenantId,
    batchSize,
    jobId: jobRecord.id,
  }, {
    attempts: 1,
  })
  
  await prisma.enrichmentJob.update({
    where: { id: jobRecord.id },
    data: { status: 'running' },
  })
  
  return job.id as string
}

export async function scheduleSalesforceSync(tenantId: string, batchSize: number = 200): Promise<string> {
  const jobRecord = await prisma.enrichmentJob.create({
    data: {
      tenantId,
      jobType: 'salesforce_sync',
      status: 'pending',
    },
  })
  
  const job = await syncQueue.add('sync-contacts', {
    tenantId,
    batchSize,
    jobId: jobRecord.id,
  }, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  })
  
  await prisma.enrichmentJob.update({
    where: { id: jobRecord.id },
    data: { status: 'running' },
  })
  
  return job.id as string
}

// Bulk enrichment
export async function scheduleBulkEnrichment(tenantId: string, contactIds: string[], type: 'abn' | 'website'): Promise<string[]> {
  const jobIds: string[] = []
  
  for (const contactId of contactIds) {
    const jobId = type === 'abn' 
      ? await scheduleABNLookup(contactId, tenantId)
      : await scheduleWebsiteScrape(contactId, tenantId)
    
    jobIds.push(jobId)
  }
  
  return jobIds
}

// Get job status
export async function getJobStatus(jobId: string) {
  const job = await enrichmentQueue.getJob(jobId)
  
  if (!job) {
    return null
  }
  
  return {
    id: job.id,
    state: await job.getState(),
    progress: job.progress(),
    result: job.returnvalue,
    failedReason: job.failedReason,
  }
}