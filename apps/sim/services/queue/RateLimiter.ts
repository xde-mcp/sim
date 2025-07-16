import { and, eq, sql } from 'drizzle-orm'
import { createLogger } from '@/lib/logs/console-logger'
import { db } from '@/db'
import { userRateLimits, workflowExecutionJobs } from '@/db/schema'
import { RATE_LIMITS, type TriggerType } from './types'

const logger = createLogger('RateLimiter')

export class RateLimiter {
  /**
   * Check if user can execute a workflow
   * Manual executions bypass rate limiting entirely
   */
  async checkRateLimit(
    userId: string,
    subscriptionPlan: 'free' | 'pro' | 'team' | 'enterprise' = 'free',
    triggerType: TriggerType = 'manual',
    isAsync = false
  ): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
    try {
      if (triggerType === 'manual') {
        return {
          allowed: true,
          remaining: 999999,
          resetAt: new Date(Date.now() + 60000),
        }
      }

      const limit = RATE_LIMITS[subscriptionPlan]
      const execLimit = isAsync
        ? limit.asyncApiExecutionsPerMinute
        : limit.syncApiExecutionsPerMinute
      const concurrentLimit = isAsync
        ? limit.asyncApiConcurrentExecutions
        : limit.syncApiConcurrentExecutions

      const now = new Date()
      const windowStart = new Date(now.getTime() - 60000) // 1 minute ago

      // Get or create rate limit record
      const [rateLimitRecord] = await db
        .select()
        .from(userRateLimits)
        .where(eq(userRateLimits.userId, userId))
        .limit(1)

      if (!rateLimitRecord || new Date(rateLimitRecord.windowStart) < windowStart) {
        // First request or expired window - create/reset record
        await db
          .insert(userRateLimits)
          .values({
            userId,
            executionRequests: 1,
            windowStart: now,
            lastRequestAt: now,
            isRateLimited: false,
          })
          .onConflictDoUpdate({
            target: userRateLimits.userId,
            set: {
              executionRequests: 1,
              windowStart: now,
              lastRequestAt: now,
              isRateLimited: false,
              rateLimitResetAt: null,
            },
          })

        return {
          allowed: true,
          remaining: execLimit - 1,
          resetAt: new Date(now.getTime() + 60000), // 1 minute from now
        }
      }

      // Check execution limit
      const newExecutionRequests = rateLimitRecord.executionRequests + 1
      if (newExecutionRequests > execLimit) {
        // Rate limited
        const resetAt = new Date(new Date(rateLimitRecord.windowStart).getTime() + 60000)

        if (!rateLimitRecord.isRateLimited) {
          await db
            .update(userRateLimits)
            .set({
              isRateLimited: true,
              rateLimitResetAt: resetAt,
            })
            .where(eq(userRateLimits.userId, userId))
        }

        return {
          allowed: false,
          remaining: 0,
          resetAt,
        }
      }

      // Check concurrent execution limit (only for API executions)
      const concurrentCount = await this.getConcurrentExecutionCount(userId, triggerType)
      if (concurrentCount >= concurrentLimit) {
        return {
          allowed: false,
          remaining: execLimit - rateLimitRecord.executionRequests,
          resetAt: new Date(new Date(rateLimitRecord.windowStart).getTime() + 60000),
        }
      }

      // Update the record
      await db
        .update(userRateLimits)
        .set({
          executionRequests: newExecutionRequests,
          lastRequestAt: now,
        })
        .where(eq(userRateLimits.userId, userId))

      return {
        allowed: true,
        remaining: execLimit - newExecutionRequests,
        resetAt: new Date(new Date(rateLimitRecord.windowStart).getTime() + 60000),
      }
    } catch (error) {
      logger.error('Error checking rate limit:', error)
      // Allow execution on error to avoid blocking users
      return {
        allowed: true,
        remaining: 0,
        resetAt: new Date(Date.now() + 60000),
      }
    }
  }

  /**
   * Get current rate limit status for user
   * Only applies to API executions
   */
  async getRateLimitStatus(
    userId: string,
    subscriptionPlan: 'free' | 'pro' | 'team' | 'enterprise' = 'free',
    triggerType: TriggerType = 'manual',
    isAsync = false
  ): Promise<{ used: number; limit: number; remaining: number; resetAt: Date }> {
    try {
      if (triggerType === 'manual') {
        return {
          used: 0,
          limit: 999999,
          remaining: 999999,
          resetAt: new Date(Date.now() + 60000),
        }
      }

      const limit = RATE_LIMITS[subscriptionPlan]
      const execLimit = isAsync
        ? limit.asyncApiExecutionsPerMinute
        : limit.syncApiExecutionsPerMinute
      const now = new Date()
      const windowStart = new Date(now.getTime() - 60000)

      const [rateLimitRecord] = await db
        .select()
        .from(userRateLimits)
        .where(eq(userRateLimits.userId, userId))
        .limit(1)

      if (!rateLimitRecord || new Date(rateLimitRecord.windowStart) < windowStart) {
        return {
          used: 0,
          limit: execLimit,
          remaining: execLimit,
          resetAt: new Date(now.getTime() + 60000),
        }
      }

      const used = rateLimitRecord.executionRequests
      return {
        used,
        limit: execLimit,
        remaining: Math.max(0, execLimit - used),
        resetAt: new Date(new Date(rateLimitRecord.windowStart).getTime() + 60000),
      }
    } catch (error) {
      logger.error('Error getting rate limit status:', error)
      const execLimit = isAsync
        ? RATE_LIMITS[subscriptionPlan].asyncApiExecutionsPerMinute
        : RATE_LIMITS[subscriptionPlan].syncApiExecutionsPerMinute
      return {
        used: 0,
        limit: execLimit,
        remaining: execLimit,
        resetAt: new Date(Date.now() + 60000),
      }
    }
  }

  /**
   * Reset rate limit for user (admin action)
   */
  async resetRateLimit(userId: string): Promise<void> {
    try {
      await db.delete(userRateLimits).where(eq(userRateLimits.userId, userId))

      logger.info(`Reset rate limit for user ${userId}`)
    } catch (error) {
      logger.error('Error resetting rate limit:', error)
      throw error
    }
  }

  /**
   * Get current concurrent execution count for user
   * Only applies to API executions
   */
  private async getConcurrentExecutionCount(
    userId: string,
    triggerType: TriggerType
  ): Promise<number> {
    if (triggerType === 'manual') {
      return 0
    }

    const [result] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(workflowExecutionJobs)
      .where(
        and(
          eq(workflowExecutionJobs.userId, userId),
          eq(workflowExecutionJobs.status, 'processing'),
          sql`${workflowExecutionJobs.triggerType} != 'manual'`
        )
      )
    return result?.count || 0
  }
}
