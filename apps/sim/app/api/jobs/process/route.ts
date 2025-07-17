import { createLogger } from '@/lib/logs/console-logger'
import { JobProcessor } from '@/services/queue'

const logger = createLogger('ProcessJobsCron')

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const startTime = Date.now()
  logger.info('Starting cron job processing')

  try {
    const processor = new JobProcessor()
    const result = await processor.processBatch(20)

    const duration = Date.now() - startTime

    logger.info('Cron job processing completed', {
      started: result.started,
      skipped: result.skipped,
      duration: `${duration}ms`,
    })

    return Response.json({
      success: true,
      started: result.started,
      skipped: result.skipped,
      duration,
      message: 'Jobs started in background',
    })
  } catch (error: any) {
    const duration = Date.now() - startTime

    logger.error('Cron job processing failed', {
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
