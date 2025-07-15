import { eq, sql } from 'drizzle-orm'
import { createLogger } from '@/lib/logs/console-logger'
import { db } from '@/db'
import { userRateLimits } from '@/db/schema'
import { RATE_LIMITS } from './types'

const logger = createLogger('RateLimiter')

export class RateLimiter {
  /**
   * Check if user can execute workflow based on rate limits
   */
  async checkRateLimit(
    userId: string,
    subscriptionPlan: 'free' | 'pro' | 'team' | 'enterprise' = 'free'
  ): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
    try {
      const limit = RATE_LIMITS[subscriptionPlan]
      const now = new Date()
      const windowStart = new Date(now.getTime() - 3600000) // 1 hour ago

      // Get or create rate limit record
      const [rateLimitRecord] = await db
        .select()
        .from(userRateLimits)
        .where(eq(userRateLimits.userId, userId))
        .limit(1)

      if (!rateLimitRecord) {
        // First request - create record
        await db.insert(userRateLimits).values({
          userId,
          executionRequests: 1,
          windowStart: now,
          lastRequestAt: now,
          isRateLimited: false,
        })

        return {
          allowed: true,
          remaining: limit.executionsPerHour - 1,
          resetAt: new Date(now.getTime() + 3600000),
        }
      }

      // Convert string timestamps to Dates for comparison
      const recordWindowStart = new Date(rateLimitRecord.windowStart)

      // Check if window has expired
      if (recordWindowStart < windowStart) {
        // Reset window
        await db
          .update(userRateLimits)
          .set({
            executionRequests: 1,
            windowStart: now,
            lastRequestAt: now,
            isRateLimited: false,
            rateLimitResetAt: null,
          })
          .where(eq(userRateLimits.userId, userId))

        return {
          allowed: true,
          remaining: limit.executionsPerHour - 1,
          resetAt: new Date(now.getTime() + 3600000),
        }
      }

      // Check if under limit
      if (rateLimitRecord.executionRequests < limit.executionsPerHour) {
        // Increment counter
        await db
          .update(userRateLimits)
          .set({
            executionRequests: sql`${userRateLimits.executionRequests} + 1`,
            lastRequestAt: now,
          })
          .where(eq(userRateLimits.userId, userId))

        return {
          allowed: true,
          remaining: limit.executionsPerHour - rateLimitRecord.executionRequests - 1,
          resetAt: new Date(recordWindowStart.getTime() + 3600000),
        }
      }

      // Rate limit exceeded
      const resetAt = new Date(recordWindowStart.getTime() + 3600000)
      await db
        .update(userRateLimits)
        .set({
          isRateLimited: true,
          rateLimitResetAt: resetAt,
        })
        .where(eq(userRateLimits.userId, userId))

      return {
        allowed: false,
        remaining: 0,
        resetAt,
      }
    } catch (error) {
      logger.error('Error checking rate limit:', error)
      // On error, allow the request but log it
      return {
        allowed: true,
        remaining: 0,
        resetAt: new Date(Date.now() + 3600000), // 1 hour from now
      }
    }
  }

  /**
   * Get current rate limit status for user
   */
  async getRateLimitStatus(
    userId: string,
    subscriptionPlan: 'free' | 'pro' | 'team' | 'enterprise' = 'free'
  ): Promise<{ used: number; limit: number; remaining: number; resetAt: Date }> {
    try {
      const limit = RATE_LIMITS[subscriptionPlan]
      const now = new Date()
      const windowStart = new Date(now.getTime() - 3600000)

      const [rateLimitRecord] = await db
        .select()
        .from(userRateLimits)
        .where(eq(userRateLimits.userId, userId))
        .limit(1)

      if (!rateLimitRecord || new Date(rateLimitRecord.windowStart) < windowStart) {
        // No record or expired window
        return {
          used: 0,
          limit: limit.executionsPerHour,
          remaining: limit.executionsPerHour,
          resetAt: new Date(now.getTime() + 3600000),
        }
      }

      const used = rateLimitRecord.executionRequests
      return {
        used,
        limit: limit.executionsPerHour,
        remaining: Math.max(0, limit.executionsPerHour - used),
        resetAt: new Date(new Date(rateLimitRecord.windowStart).getTime() + 3600000),
      }
    } catch (error) {
      logger.error('Error getting rate limit status:', error)
      return {
        used: 0,
        limit: RATE_LIMITS[subscriptionPlan].executionsPerHour,
        remaining: RATE_LIMITS[subscriptionPlan].executionsPerHour,
        resetAt: new Date(Date.now() + 3600000),
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
}
