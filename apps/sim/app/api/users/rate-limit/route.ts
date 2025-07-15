import { eq } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { createLogger } from '@/lib/logs/console-logger'
import { db } from '@/db'
import { apiKey as apiKeyTable, subscription } from '@/db/schema'
import { RateLimiter } from '@/services/queue'
import { createErrorResponse } from '../../workflows/utils'

const logger = createLogger('RateLimitAPI')

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

    // Get user subscription
    const [subscriptionRecord] = await db
      .select({ plan: subscription.plan })
      .from(subscription)
      .where(eq(subscription.referenceId, authenticatedUserId))
      .limit(1)

    const subscriptionPlan = (subscriptionRecord?.plan || 'free') as
      | 'free'
      | 'pro'
      | 'team'
      | 'enterprise'

    const rateLimiter = new RateLimiter()
    const rateLimitStatus = await rateLimiter.getRateLimitStatus(
      authenticatedUserId,
      subscriptionPlan
    )
    // const concurrentExecutions = await rateLimiter.getConcurrentExecutions(authenticatedUserId)
    const concurrentExecutions = 0 // TODO: Implement this if needed

    return NextResponse.json({
      success: true,
      rateLimit: {
        isLimited: rateLimitStatus.remaining === 0,
        limit: rateLimitStatus.limit,
        remaining: rateLimitStatus.remaining,
        resetAt: rateLimitStatus.resetAt.toISOString(),
        currentUsage: rateLimitStatus.used,
        concurrentExecutions,
      },
    })
  } catch (error: any) {
    logger.error('Error checking rate limit:', error)
    return createErrorResponse(error.message || 'Failed to check rate limit', 500)
  }
}
