import { beforeEach, describe, expect, it, vi } from 'vitest'
import { JobQueueService } from './JobQueueService'
import { SYSTEM_LIMITS } from './types'

// Mock all dependencies
vi.mock('@/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    execute: vi.fn(),
  },
}))

vi.mock('@/lib/billing', () => ({
  getHighestPrioritySubscription: vi.fn().mockResolvedValue({ plan: 'free' }),
}))

vi.mock('./RateLimiter', () => ({
  RateLimiter: vi.fn().mockImplementation(() => ({
    checkRateLimit: vi.fn(),
    getRateLimitStatus: vi.fn(),
    resetRateLimit: vi.fn(),
  })),
}))

// Mock drizzle-orm functions
vi.mock('drizzle-orm', () => ({
  eq: vi.fn((field, value) => ({ field, value })),
  and: vi.fn((...conditions) => ({ and: conditions })),
  desc: vi.fn((field) => ({ desc: field })),
  inArray: vi.fn((field, values) => ({ field, values })),
  lt: vi.fn((field, value) => ({ field, value })),
  sql: vi.fn((strings, ...values) => ({ sql: strings.join('?'), values })),
}))

import { db } from '@/db'

describe('JobQueueService', () => {
  let jobQueue: JobQueueService
  const testUserId = 'test-user-456'
  const testWorkflowId = 'test-workflow-789'

  beforeEach(() => {
    vi.clearAllMocks()
    jobQueue = new JobQueueService()
  })

  describe('createJob', () => {
    it('should create a new job successfully', async () => {
      // Mock getSubscriptionPlan to return 'free' tier
      const mockGetSubscriptionPlan = vi
        .spyOn(jobQueue as any, 'getSubscriptionPlan')
        .mockResolvedValue('free')

      // Mock rate limiter to allow request
      const mockRateLimiter = (jobQueue as any).rateLimiter
      mockRateLimiter.checkRateLimit.mockResolvedValue({
        allowed: true,
        remaining: 19,
        resetAt: new Date(),
      })

      // Set up db.select mock sequence for:
      // 1. Concurrent executions check (should return 0, under limit of 2)
      // 2. Queue depth check (should return < max)
      // 3. Queue position check for response
      let selectCallCount = 0
      vi.mocked(db.select).mockImplementation(() => {
        selectCallCount++

        if (selectCallCount === 1) {
          // Concurrent executions check - return 0 processing jobs (under limit of 2)
          return {
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockResolvedValue([{ count: 0 }]),
          } as any
        }
        if (selectCallCount === 2) {
          // Queue depth check - return manageable queue depth
          return {
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockResolvedValue([{ count: 10 }]),
          } as any
        }
        // Queue position check
        return {
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockResolvedValue([{ count: 5 }]),
        } as any
      })

      // Mock insert
      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockResolvedValue({}),
      } as any)

      const input = { test: 'data' }
      const result = await jobQueue.createJob({
        workflowId: testWorkflowId,
        userId: testUserId,
        input,
        triggerType: 'api',
      })

      expect(result.jobId).toBeDefined()
      expect(result.status).toBe('pending')
      expect(result.position).toBeDefined()
      expect(result.estimatedStartTime).toBeInstanceOf(Date)
      expect(mockGetSubscriptionPlan).toHaveBeenCalledWith(testUserId)
    })

    it('should respect rate limits', async () => {
      // Mock getSubscriptionPlan to return 'free' tier
      const mockGetSubscriptionPlan = vi
        .spyOn(jobQueue as any, 'getSubscriptionPlan')
        .mockResolvedValue('free')

      // Mock rate limiter to deny request
      const mockRateLimiter = (jobQueue as any).rateLimiter
      mockRateLimiter.checkRateLimit.mockResolvedValue({
        allowed: false,
        remaining: 0,
        resetAt: new Date(),
      })

      await expect(
        jobQueue.createJob({
          workflowId: testWorkflowId,
          userId: testUserId,
          input: {},
          triggerType: 'api',
        })
      ).rejects.toThrow(/Rate limit exceeded/)
    })

    it('should enforce concurrent execution limits', async () => {
      // Mock getSubscriptionPlan to return 'free' tier
      const mockGetSubscriptionPlan = vi
        .spyOn(jobQueue as any, 'getSubscriptionPlan')
        .mockResolvedValue('free')

      // Mock rate limiter to allow request
      const mockRateLimiter = (jobQueue as any).rateLimiter
      mockRateLimiter.checkRateLimit.mockResolvedValue({
        allowed: true,
        remaining: 19,
        resetAt: new Date(),
      })

      // Set up db.select mock to return concurrent limit reached
      vi.mocked(db.select).mockImplementation(() => {
        return {
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockResolvedValue([{ count: 2 }]), // At limit of 2
        } as any
      })

      await expect(
        jobQueue.createJob({
          workflowId: testWorkflowId,
          userId: testUserId,
          input: {},
          triggerType: 'api',
        })
      ).rejects.toThrow(/Concurrent execution limit/)
    })

    it('should reject when global queue is full', async () => {
      // Mock getSubscriptionPlan to return 'free' tier
      const mockGetSubscriptionPlan = vi
        .spyOn(jobQueue as any, 'getSubscriptionPlan')
        .mockResolvedValue('free')

      // Mock rate limiter to allow request
      const mockRateLimiter = (jobQueue as any).rateLimiter
      mockRateLimiter.checkRateLimit.mockResolvedValue({
        allowed: true,
        remaining: 19,
        resetAt: new Date(),
      })

      // Set up db.select mock sequence for:
      // 1. Concurrent executions check (should return 0, under limit)
      // 2. Queue depth check (should return full queue)
      let selectCallCount = 0
      vi.mocked(db.select).mockImplementation(() => {
        selectCallCount++

        if (selectCallCount === 1) {
          // Concurrent executions check - return 0 processing jobs (under limit)
          return {
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockResolvedValue([{ count: 0 }]),
          } as any
        }
        // Queue depth check - return full queue (at SYSTEM_LIMITS.maxQueueDepth)
        return {
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockResolvedValue([{ count: SYSTEM_LIMITS.maxQueueDepth }]),
        } as any
      })

      await expect(
        jobQueue.createJob({
          workflowId: testWorkflowId,
          userId: testUserId,
          input: {},
          triggerType: 'api',
        })
      ).rejects.toThrow(/System queue is full/)
    })
  })

  describe('getJob', () => {
    it('should retrieve job by ID', async () => {
      const jobId = 'test-job-id'
      const mockJob = {
        id: jobId,
        workflowId: testWorkflowId,
        userId: testUserId,
        status: 'pending',
        createdAt: new Date(),
        priority: 50,
      }

      // Set up select mock sequence for getJob
      let selectCallCount = 0
      vi.mocked(db.select).mockImplementation(() => {
        selectCallCount++

        if (selectCallCount === 1) {
          // First call in getJob - returns job
          return {
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockResolvedValue([mockJob]),
          } as any
        }
        // Queue position check - returns count for position calculation
        return {
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockResolvedValue([{ count: 0 }]),
        } as any
      })

      const job = await jobQueue.getJob(jobId, testUserId)

      expect(job).toBeDefined()
      expect(job?.jobId).toBe(jobId)
      expect(job?.status).toBe('pending')
    })

    it('should not retrieve job from different user', async () => {
      // Mock returning empty array (no job found)
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([]),
      } as any)

      const job = await jobQueue.getJob('some-job-id', 'different-user')

      expect(job).toBeNull()
    })
  })

  describe('cancelJob', () => {
    it('should cancel pending job', async () => {
      const jobId = 'test-job-id'

      // Mock update returning 1 row affected
      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ id: jobId }]),
      } as any)

      const cancelled = await jobQueue.cancelJob(jobId, testUserId)
      expect(cancelled).toBe(true)
      expect(db.update).toHaveBeenCalled()
    })

    it('should not cancel processing job', async () => {
      // Mock update returning 0 rows affected
      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([]),
      } as any)

      const cancelled = await jobQueue.cancelJob('processing-job', testUserId)
      expect(cancelled).toBe(false)
    })
  })

  describe('getUserJobs', () => {
    it('should return user jobs with pagination', async () => {
      const mockJobs = Array.from({ length: 3 }, (_, i) => ({
        id: `job-${i}`,
        workflowId: testWorkflowId,
        userId: testUserId,
        status: 'completed',
        createdAt: new Date(Date.now() - i * 1000),
        priority: 50,
      }))

      // Set up mock sequence for getUserJobs
      let selectCallCount = 0
      vi.mocked(db.select).mockImplementation(() => {
        selectCallCount++

        if (selectCallCount === 1) {
          // Jobs query
          return {
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            orderBy: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            offset: vi.fn().mockResolvedValue(mockJobs),
          } as any
        }
        // Count query
        return {
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockResolvedValue([{ count: 5 }]),
        } as any
      })

      const { jobs, total } = await jobQueue.getUserJobs(testUserId, 3, 0)

      expect(jobs).toHaveLength(3)
      expect(total).toBe(5)
      expect(jobs[0].createdAt.getTime()).toBeGreaterThan(jobs[1].createdAt.getTime())
    })
  })
})
