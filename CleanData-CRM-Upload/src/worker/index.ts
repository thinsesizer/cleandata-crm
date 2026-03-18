/**
 * Background Job Worker
 * 
 * Run this separately from the main Next.js app:
 * npm run worker
 * 
 * Or use a process manager like PM2 in production
 */

import '../queue/jobs' // Import to register processors

console.log('🚀 Worker started')
console.log('Listening for jobs...')

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully')
  process.exit(0)
})

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully')
  process.exit(0)
})