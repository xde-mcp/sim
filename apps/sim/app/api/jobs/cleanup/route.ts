import { createLogger } from '@/lib/logs/console-logger'
import { JobProcessor } from '@/services/queue'

const logger = createLogger('CleanupJobsCron')

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const startTime = Date.now()
  logger.info('Starting job cleanup cron')

  try {
    const processor = new JobProcessor()
    const result = await processor.cleanupOldJobs()

    const duration = Date.now() - startTime

    logger.info('Job cleanup cron completed', {
      deletedCount: result.deletedCount,
      duration: `${duration}ms`,
    })

    return Response.json({
      success: true,
      deletedCount: result.deletedCount,
      duration,
    })
  } catch (error: any) {
    const duration = Date.now() - startTime

    logger.error('Job cleanup cron failed', {
      error: error.message,
      duration: `${duration}ms`,
    })

    return Response.json(
      {
        success: false,
        error: error.message,
        duration,
      },
      { status: 500 }
    )
  }
}
