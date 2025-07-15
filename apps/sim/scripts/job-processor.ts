#!/usr/bin/env bun
import { sql } from 'drizzle-orm'
import { createLogger } from '@/lib/logs/console-logger'
import { db } from '@/db'
import { JobProcessor } from '@/services/queue'

const logger = createLogger('JobProcessorRunner')

async function main() {
  logger.info('Starting job processor...')

  // Test database connection
  try {
    await db.execute(sql`SELECT 1`)
    logger.info('Database connection successful')
  } catch (error) {
    logger.error('Failed to connect to database:', error)
    process.exit(1)
  }

  const processor = new JobProcessor()

  // Handle graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down job processor...')
    await processor.stop()
    process.exit(0)
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)

  // Start processing
  try {
    await processor.start()
    logger.info('Job processor is running')
  } catch (error) {
    logger.error('Failed to start job processor:', error)
    process.exit(1)
  }
}

// Run the processor
main().catch((error) => {
  logger.error('Unhandled error:', error)
  process.exit(1)
})
