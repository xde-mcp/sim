import { runs } from '@trigger.dev/sdk/v3'
import { eq } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { createLogger } from '@/lib/logs/console-logger'
import { db } from '@/db'
import { apiKey as apiKeyTable } from '@/db/schema'
import { JobQueueService } from '@/services/queue'
import { createErrorResponse } from '../../workflows/utils'

const logger = createLogger('TaskStatusAPI')

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId: taskId } = await params
  const requestId = crypto.randomUUID().slice(0, 8)

  try {
    logger.debug(`[${requestId}] Getting status for task: ${taskId}`)

    // Try session auth first (for web UI)
    const session = await getSession()
    let authenticatedUserId: string | null = session?.user?.id || null

    if (!authenticatedUserId) {
      const apiKeyHeader = request.headers.get('x-api-key')
      if (apiKeyHeader) {
        const [apiKeyRecord] = await db
          .select({ userId: apiKeyTable.userId })
          .from(apiKeyTable)
          .where(eq(apiKeyTable.key, apiKeyHeader))
          .limit(1)

        if (apiKeyRecord) {
          authenticatedUserId = apiKeyRecord.userId
        }
      }
    }

    if (!authenticatedUserId) {
      return createErrorResponse('Authentication required', 401)
    }

    // Fetch task status from Trigger.dev
    const run = await runs.retrieve(taskId)

    logger.debug(`[${requestId}] Task ${taskId} status: ${run.status}`)

    // Map Trigger.dev status to our format
    const statusMap = {
      QUEUED: 'queued',
      WAITING_FOR_DEPLOY: 'queued',
      EXECUTING: 'processing',
      RESCHEDULED: 'processing',
      FROZEN: 'processing',
      COMPLETED: 'completed',
      CANCELED: 'cancelled',
      FAILED: 'failed',
      CRASHED: 'failed',
      INTERRUPTED: 'failed',
      SYSTEM_FAILURE: 'failed',
      EXPIRED: 'failed',
    } as const

    const mappedStatus = statusMap[run.status as keyof typeof statusMap] || 'unknown'

    // Build response based on status
    const response: any = {
      success: true,
      taskId,
      status: mappedStatus,
      createdAt: run.createdAt,
      startedAt: run.startedAt,
      updatedAt: run.updatedAt,
    }

    // Add completion details if finished
    if (mappedStatus === 'completed') {
      response.completedAt = run.finishedAt || run.updatedAt
      response.output = run.output // This contains the workflow execution results
      response.duration = run.durationMs
      response.cost = run.costInCents ? run.costInCents / 100 : 0
    }

    // Add error details if failed
    if (mappedStatus === 'failed') {
      response.completedAt = run.finishedAt || run.updatedAt
      response.error = run.error
      response.duration = run.durationMs
    }

    // Add progress info if still processing
    if (mappedStatus === 'processing' || mappedStatus === 'queued') {
      response.estimatedDuration = 180000 // 3 minutes max from our config
    }

    return NextResponse.json(response)
  } catch (error: any) {
    logger.error(`[${requestId}] Error fetching task status:`, error)

    if (error.message?.includes('not found') || error.status === 404) {
      return createErrorResponse('Task not found', 404)
    }

    return createErrorResponse('Failed to fetch task status', 500)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params

  try {
    // Try session auth first (for web UI)
    const session = await getSession()
    let authenticatedUserId: string | null = session?.user?.id || null

    // If no session, check for API key auth
    if (!authenticatedUserId) {
      const apiKeyHeader = request.headers.get('x-api-key')
      if (apiKeyHeader) {
        // Verify API key
        const [apiKeyRecord] = await db
          .select({ userId: apiKeyTable.userId })
          .from(apiKeyTable)
          .where(eq(apiKeyTable.key, apiKeyHeader))
          .limit(1)

        if (apiKeyRecord) {
          authenticatedUserId = apiKeyRecord.userId
        }
      }
    }

    if (!authenticatedUserId) {
      return createErrorResponse('Authentication required', 401)
    }

    const jobQueue = new JobQueueService()
    const cancelled = await jobQueue.cancelJob(jobId, authenticatedUserId)

    if (!cancelled) {
      return createErrorResponse(
        'Job not found or cannot be cancelled (may already be processing)',
        400
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Job cancelled successfully',
    })
  } catch (error: any) {
    logger.error('Error cancelling job:', error)
    return createErrorResponse(error.message || 'Failed to cancel job', 500)
  }
}
