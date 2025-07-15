import { eq } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { createLogger } from '@/lib/logs/console-logger'
import { db } from '@/db'
import { apiKey as apiKeyTable } from '@/db/schema'
import { JobQueueService } from '@/services/queue'
import { createErrorResponse } from '../workflows/utils'

const logger = createLogger('JobsListAPI')

export async function GET(request: NextRequest) {
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

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const limit = Math.min(Number.parseInt(searchParams.get('limit') || '20'), 100)
    const offset = Number.parseInt(searchParams.get('offset') || '0')

    const jobQueue = new JobQueueService()
    const { jobs, total } = await jobQueue.getUserJobs(authenticatedUserId, limit, offset)

    return NextResponse.json({
      success: true,
      jobs: jobs.map((job) => ({
        jobId: job.jobId,
        status: job.status,
        createdAt: job.createdAt.toISOString(),
        estimatedStartTime: job.estimatedStartTime?.toISOString(),
        position: job.position,
        completedAt: job.completedAt?.toISOString(),
        error: job.error,
        hasOutput: !!job.output,
      })),
      pagination: {
        limit,
        offset,
        total,
        hasMore: offset + limit < total,
      },
    })
  } catch (error: any) {
    logger.error('Error listing jobs:', error)
    return createErrorResponse(error.message || 'Failed to list jobs', 500)
  }
}
