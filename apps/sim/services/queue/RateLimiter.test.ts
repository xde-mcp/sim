import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RateLimiter } from './RateLimiter'
import { RATE_LIMITS } from './types'

// Mock the database module
vi.mock('@/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}))

// Mock drizzle-orm
vi.mock('drizzle-orm', () => ({
  eq: vi.fn((field, value) => ({ field, value })),
  sql: vi.fn((strings, ...values) => ({ sql: strings.join('?'), values })),
}))

import { db } from '@/db'

describe('RateLimiter', () => {
  const rateLimiter = new RateLimiter()
  const testUserId = 'test-user-123'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('checkRateLimit', () => {
    it('should allow first request for new user', async () => {
      // Mock no existing rate limit record
      const mockSelect = vi.fn().mockReturnThis()
      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockLimit = vi.fn().mockResolvedValue([])

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        limit: mockLimit,
      } as any)

      // Mock insert
      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockResolvedValue({}),
      } as any)

      const result = await rateLimiter.checkRateLimit(testUserId, 'free')

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(RATE_LIMITS.free.executionsPerHour - 1)
      expect(result.resetAt).toBeInstanceOf(Date)
      expect(db.insert).toHaveBeenCalled()
    })

    it('should decrement remaining count on subsequent requests', async () => {
      const now = new Date()

      // Mock existing rate limit record
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([
          {
            userId: testUserId,
            executionRequests: 5,
            windowStart: now,
            lastRequestAt: now,
            isRateLimited: false,
          },
        ]),
      } as any)

      // Mock update
      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue({}),
      } as any)

      const result = await rateLimiter.checkRateLimit(testUserId, 'free')

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(RATE_LIMITS.free.executionsPerHour - 6)
      expect(db.update).toHaveBeenCalled()
    })

    it('should block requests when limit is exceeded', async () => {
      const now = new Date()

      // Mock rate limit at max
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([
          {
            userId: testUserId,
            executionRequests: RATE_LIMITS.free.executionsPerHour,
            windowStart: now,
            lastRequestAt: now,
            isRateLimited: false,
          },
        ]),
      } as any)

      // Mock update
      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue({}),
      } as any)

      const result = await rateLimiter.checkRateLimit(testUserId, 'free')

      expect(result.allowed).toBe(false)
      expect(result.remaining).toBe(0)
    })

    it('should reset window after expiration', async () => {
      const oldWindowStart = new Date()
      oldWindowStart.setHours(oldWindowStart.getHours() - 2) // 2 hours ago

      // Mock old rate limit record
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([
          {
            userId: testUserId,
            executionRequests: RATE_LIMITS.free.executionsPerHour,
            windowStart: oldWindowStart,
            lastRequestAt: oldWindowStart,
            isRateLimited: true,
          },
        ]),
      } as any)

      // Mock update for window reset
      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue({}),
      } as any)

      const result = await rateLimiter.checkRateLimit(testUserId, 'free')

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(RATE_LIMITS.free.executionsPerHour - 1)
      expect(db.update).toHaveBeenCalled()
    })

    it('should handle different subscription plans correctly', async () => {
      const plans = ['free', 'pro', 'team', 'enterprise'] as const

      for (const plan of plans) {
        vi.clearAllMocks()

        // Mock no existing record
        vi.mocked(db.select).mockReturnValue({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue([]),
        } as any)

        // Mock insert
        vi.mocked(db.insert).mockReturnValue({
          values: vi.fn().mockResolvedValue({}),
        } as any)

        const result = await rateLimiter.checkRateLimit(`${testUserId}-${plan}`, plan)

        expect(result.allowed).toBe(true)
        expect(result.remaining).toBe(RATE_LIMITS[plan].executionsPerHour - 1)
      }
    })
  })

  describe('getRateLimitStatus', () => {
    it('should return correct status for user with no history', async () => {
      // Mock no existing record
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      } as any)

      const status = await rateLimiter.getRateLimitStatus(testUserId, 'free')

      expect(status.used).toBe(0)
      expect(status.limit).toBe(RATE_LIMITS.free.executionsPerHour)
      expect(status.remaining).toBe(RATE_LIMITS.free.executionsPerHour)
    })

    it('should return correct status after some requests', async () => {
      const now = new Date()

      // Mock existing record with 5 requests
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([
          {
            userId: testUserId,
            executionRequests: 5,
            windowStart: now,
            lastRequestAt: now,
            isRateLimited: false,
          },
        ]),
      } as any)

      const status = await rateLimiter.getRateLimitStatus(testUserId, 'free')

      expect(status.used).toBe(5)
      expect(status.limit).toBe(RATE_LIMITS.free.executionsPerHour)
      expect(status.remaining).toBe(RATE_LIMITS.free.executionsPerHour - 5)
    })
  })

  describe('resetRateLimit', () => {
    it('should reset rate limit for user', async () => {
      // Mock delete
      vi.mocked(db.delete).mockReturnValue({
        where: vi.fn().mockResolvedValue({}),
      } as any)

      await rateLimiter.resetRateLimit(testUserId)

      expect(db.delete).toHaveBeenCalled()
    })
  })
})
