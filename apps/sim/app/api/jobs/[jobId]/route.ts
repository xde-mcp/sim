import { eq } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { createLogger } from '@/lib/logs/console-logger'
import { db } from '@/db'
import { apiKey as apiKeyTable } from '@/db/schema'
import { JobQueueService } from '@/services/queue'
import { createErrorResponse } from '../../workflows/utils'

const logger = createLogger('JobsAPI')

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params

  try {
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

    const jobQueue = new JobQueueService()
    const job = await jobQueue.getJob(jobId, authenticatedUserId)

    if (!job) {
      return createErrorResponse('Job not found', 404)
    }

    return NextResponse.json({
      success: true,
      job: {
        jobId: job.jobId,
        status: job.status,
        createdAt: job.createdAt.toISOString(),
        estimatedStartTime: job.estimatedStartTime?.toISOString(),
        position: job.position,
        output: job.output,
        error: job.error,
        completedAt: job.completedAt?.toISOString(),
        executionId: job.executionId,
      },
    })
  } catch (error: any) {
    logger.error('Error getting job status:', error)
    return createErrorResponse(error.message || 'Failed to get job status', 500)
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
