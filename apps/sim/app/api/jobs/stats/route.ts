import { eq, sql } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/db'
import { userStats, workflowExecutionJobs } from '@/db/schema'
import { syncExecutor } from '@/services/queue'
import { createErrorResponse } from '../../workflows/utils'

export async function GET(request: NextRequest) {
  try {
    // Only allow authenticated users to view stats
    const session = await getSession()
    if (!session?.user?.id) {
      return createErrorResponse('Authentication required', 401)
    }

    // Get sync queue stats
    const syncStats = syncExecutor.getStats()

    // Get async queue stats
    const [asyncStats] = await db
      .select({
        pending: sql<number>`count(*) filter (where status = 'pending')`,
        processing: sql<number>`count(*) filter (where status = 'processing')`,
        completed: sql<number>`count(*) filter (where status = 'completed')`,
        failed: sql<number>`count(*) filter (where status = 'failed')`,
        cancelled: sql<number>`count(*) filter (where status = 'cancelled')`,
        total: sql<number>`count(*)`,
      })
      .from(workflowExecutionJobs)

    // Get user's stats for the day
    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    const [userActivity] = await db
      .select({
        totalApiCalls: userStats.totalApiCalls,
        lastActive: userStats.lastActive,
      })
      .from(userStats)
      .where(eq(userStats.userId, session.user.id))

    return NextResponse.json({
      sync: {
        ...syncStats,
        status:
          syncStats.utilization > 90
            ? 'critical'
            : syncStats.utilization > 70
              ? 'warning'
              : 'healthy',
      },
      async: {
        ...asyncStats,
        pending: Number(asyncStats.pending),
        processing: Number(asyncStats.processing),
        completed: Number(asyncStats.completed),
        failed: Number(asyncStats.failed),
        cancelled: Number(asyncStats.cancelled),
        total: Number(asyncStats.total),
      },
      user: {
        totalApiCalls: userActivity?.totalApiCalls || 0,
        lastActive: userActivity?.lastActive || null,
        userId: session.user.id,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    return createErrorResponse(error.message || 'Failed to get queue stats', 500)
  }
}
