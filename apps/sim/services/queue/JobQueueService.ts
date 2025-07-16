import { and, desc, eq, gt, lt, or, sql } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'
import { createLogger } from '@/lib/logs/console-logger'
import { db } from '@/db'
import { subscription, workflowExecutionJobs } from '@/db/schema'
import { RateLimiter } from './RateLimiter'
import type {
  CreateJobOptions,
  JobResult,
  JobStatus,
  NewWorkflowExecutionJob,
  WorkflowExecutionJob,
} from './types'
import { DEFAULT_PRIORITY, RATE_LIMITS, SYSTEM_LIMITS } from './types'

const logger = createLogger('JobQueueService')

export class JobQueueService {
  private rateLimiter = new RateLimiter()

  /**
   * Create a new job in the queue
   */
  async createJob(options: CreateJobOptions): Promise<JobResult> {
    const { workflowId, userId, input, metadata } = options

    try {
      const subscriptionPlan = await this.getSubscriptionPlan(userId)
      const rateLimitCheck = await this.rateLimiter.checkRateLimit(
        userId,
        subscriptionPlan,
        options.triggerType || 'api',
        true
      )

      if (!rateLimitCheck.allowed) {
        throw new Error(
          `Rate limit exceeded. You can execute ${rateLimitCheck.remaining} more workflows. Resets at ${rateLimitCheck.resetAt.toISOString()}`
        )
      }

      const concurrentLimit = RATE_LIMITS[subscriptionPlan].asyncApiConcurrentExecutions
      const processingJobs = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(workflowExecutionJobs)
        .where(
          and(
            eq(workflowExecutionJobs.userId, userId),
            eq(workflowExecutionJobs.status, 'processing')
          )
        )

      const currentConcurrent = processingJobs[0]?.count || 0

      if (currentConcurrent >= concurrentLimit) {
        throw new Error(
          `Concurrent execution limit (${concurrentLimit}) reached. Please wait for current executions to complete.`
        )
      }

      // Check global queue depth
      const queueDepth = await this.getQueueDepth()
      if (queueDepth >= SYSTEM_LIMITS.maxQueueDepth) {
        throw new Error('System queue is full. Please try again later.')
      }

      // Create job
      const jobId = uuidv4()
      const triggerType = options.triggerType || 'api'
      const { input, metadata } = options
      const priority = options.priority ?? DEFAULT_PRIORITY

      const job: NewWorkflowExecutionJob = {
        id: jobId,
        workflowId,
        userId,
        status: 'pending',
        priority,
        input,
        metadata,
        triggerType,
        retryCount: 0,
        maxRetries: 3,
      }

      await db.insert(workflowExecutionJobs).values(job)

      logger.info(`Created job ${jobId} for workflow ${workflowId}`)

      // Get queue position
      const position = await this.getQueuePosition(jobId, userId, priority)
      const estimatedStartTime = this.estimateStartTime(position)

      logger.info(`Created job ${jobId} for workflow ${workflowId}`, {
        userId,
        priority,
        triggerType,
        position,
      })

      return {
        jobId,
        status: 'pending',
        createdAt: new Date(), // Return current date for newly created job
        estimatedStartTime,
        position,
      }
    } catch (error) {
      logger.error('Error creating job:', error)
      throw error
    }
  }

  /**
   * Get job status and details
   */
  async getJob(jobId: string, userId?: string): Promise<JobResult | null> {
    try {
      const conditions = [eq(workflowExecutionJobs.id, jobId)]
      if (userId) {
        conditions.push(eq(workflowExecutionJobs.userId, userId))
      }

      const [job] = await db
        .select()
        .from(workflowExecutionJobs)
        .where(and(...conditions))

      if (!job) {
        return null
      }

      let position: number | undefined
      let estimatedStartTime: Date | undefined

      if (job.status === 'pending') {
        position = await this.getQueuePosition(jobId, job.userId, job.priority)
        estimatedStartTime = this.estimateStartTime(position)
      }

      return {
        jobId: job.id,
        status: job.status as JobStatus,
        createdAt: new Date(job.createdAt),
        estimatedStartTime,
        position,
        output: job.output,
        error: job.error || undefined,
        completedAt: job.completedAt ? new Date(job.completedAt) : undefined,
        executionId: job.executionId || undefined,
      }
    } catch (error) {
      logger.error('Error getting job:', error)
      throw error
    }
  }

  /**
   * Cancel a pending job
   */
  async cancelJob(jobId: string, userId: string): Promise<boolean> {
    try {
      const result = await db
        .update(workflowExecutionJobs)
        .set({
          status: 'cancelled',
          completedAt: sql`now()`,
          error: 'Cancelled by user',
        })
        .where(
          and(
            eq(workflowExecutionJobs.id, jobId),
            eq(workflowExecutionJobs.userId, userId),
            eq(workflowExecutionJobs.status, 'pending')
          )
        )

      const cancelled = result.length > 0

      if (cancelled) {
        logger.info(`Cancelled job ${jobId}`)
      }

      return cancelled
    } catch (error) {
      logger.error('Error cancelling job:', error)
      throw error
    }
  }

  /**
   * Get user's recent jobs
   */
  async getUserJobs(
    userId: string,
    limit = 20,
    offset = 0
  ): Promise<{ jobs: JobResult[]; total: number }> {
    try {
      const [jobs, countResult] = await Promise.all([
        db
          .select()
          .from(workflowExecutionJobs)
          .where(eq(workflowExecutionJobs.userId, userId))
          .orderBy(desc(workflowExecutionJobs.createdAt))
          .limit(limit)
          .offset(offset),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(workflowExecutionJobs)
          .where(eq(workflowExecutionJobs.userId, userId)),
      ])

      const results: JobResult[] = await Promise.all(
        jobs.map(async (job) => {
          let position: number | undefined
          let estimatedStartTime: Date | undefined

          if (job.status === 'pending') {
            position = await this.getQueuePosition(job.id, job.userId, job.priority)
            estimatedStartTime = this.estimateStartTime(position)
          }

          return {
            jobId: job.id,
            status: job.status as JobStatus,
            createdAt: new Date(job.createdAt),
            estimatedStartTime,
            position,
            output: job.output,
            error: job.error || undefined,
            completedAt: job.completedAt ? new Date(job.completedAt) : undefined,
            executionId: job.executionId || undefined,
          }
        })
      )

      return {
        jobs: results,
        total: countResult[0]?.count || 0,
      }
    } catch (error) {
      logger.error('Error getting user jobs:', error)
      throw error
    }
  }

  /**
   * Get next job to process (called by job processor)
   */
  async getNextJob(): Promise<WorkflowExecutionJob | null> {
    try {
      // Get highest priority pending job
      const [job] = await db
        .select()
        .from(workflowExecutionJobs)
        .where(eq(workflowExecutionJobs.status, 'pending'))
        .orderBy(desc(workflowExecutionJobs.priority), workflowExecutionJobs.createdAt)
        .limit(1)

      return job || null
    } catch (error) {
      logger.error('Error getting next job:', error)
      return null
    }
  }

  /**
   * Mark job as processing
   */
  async markJobProcessing(jobId: string): Promise<boolean> {
    try {
      // First check the current status of the job
      const [currentJob] = await db
        .select({ status: workflowExecutionJobs.status })
        .from(workflowExecutionJobs)
        .where(eq(workflowExecutionJobs.id, jobId))
        .limit(1)

      if (!currentJob) {
        logger.warn(`Job ${jobId} not found when trying to mark as processing`)
        return false
      }

      if (currentJob.status !== 'pending') {
        logger.warn(
          `Job ${jobId} is not pending (status: ${currentJob.status}), cannot mark as processing`
        )
        return false
      }

      const result = await db
        .update(workflowExecutionJobs)
        .set({
          status: 'processing',
          startedAt: sql`now()`,
        })
        .where(
          and(eq(workflowExecutionJobs.id, jobId), eq(workflowExecutionJobs.status, 'pending'))
        )
        .returning({ id: workflowExecutionJobs.id })

      logger.info(
        `markJobProcessing ${jobId}: result type=${typeof result}, length=${result.length}, value=`,
        result
      )
      const success = result.length > 0
      logger.info(
        `markJobProcessing ${jobId}: ${success ? 'SUCCESS' : 'FAILED'} (affected ${result.length} rows)`
      )
      return success
    } catch (error) {
      logger.error('Error marking job as processing:', error)
      return false
    }
  }

  /**
   * Mark job as completed
   */
  async markJobCompleted(jobId: string, output: any, executionId?: string): Promise<void> {
    try {
      await db
        .update(workflowExecutionJobs)
        .set({
          status: 'completed',
          completedAt: sql`now()`,
          output,
          executionId,
        })
        .where(eq(workflowExecutionJobs.id, jobId))

      logger.info(`Marked job ${jobId} as completed`)
    } catch (error) {
      logger.error('Error marking job as completed:', error)
      throw error
    }
  }

  /**
   * Mark job as failed
   */
  async markJobFailed(jobId: string, error: string, shouldRetry = true): Promise<boolean> {
    try {
      const [job] = await db
        .select()
        .from(workflowExecutionJobs)
        .where(eq(workflowExecutionJobs.id, jobId))

      if (!job) {
        return false
      }

      const retryCount = job.retryCount + 1
      const canRetry = shouldRetry && retryCount < job.maxRetries

      await db
        .update(workflowExecutionJobs)
        .set({
          status: canRetry ? 'pending' : 'failed',
          error,
          retryCount,
          completedAt: canRetry ? null : sql`now()`,
        })
        .where(eq(workflowExecutionJobs.id, jobId))

      if (canRetry) {
        logger.info(`Job ${jobId} will be retried (attempt ${retryCount}/${job.maxRetries})`)
      } else {
        logger.error(`Job ${jobId} failed permanently: ${error}`)
      }

      return canRetry
    } catch (error) {
      logger.error('Error marking job as failed:', error)
      return false
    }
  }

  /**
   * Get current queue depth
   */
  private async getQueueDepth(): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(workflowExecutionJobs)
      .where(eq(workflowExecutionJobs.status, 'pending'))

    return result[0]?.count || 0
  }

  /**
   * Get queue position for a job
   */
  private async getQueuePosition(jobId: string, userId: string, priority: number): Promise<number> {
    const [job] = await db
      .select()
      .from(workflowExecutionJobs)
      .where(eq(workflowExecutionJobs.id, jobId))

    if (!job || job.status !== 'pending') {
      return 0
    }

    // Count jobs ahead in queue (higher priority or same priority but created earlier)
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(workflowExecutionJobs)
      .where(
        and(
          eq(workflowExecutionJobs.status, 'pending'),
          or(
            gt(workflowExecutionJobs.priority, job.priority),
            and(
              eq(workflowExecutionJobs.priority, job.priority),
              lt(workflowExecutionJobs.createdAt, job.createdAt)
            )
          )
        )
      )

    return (result[0]?.count || 0) + 1
  }

  /**
   * Estimate start time based on queue position
   */
  private estimateStartTime(position: number): Date {
    // Assume average processing time of 30 seconds per job
    const averageProcessingTime = 30000
    const estimatedWaitTime = (position * averageProcessingTime) / SYSTEM_LIMITS.maxJobProcessors
    return new Date(Date.now() + estimatedWaitTime)
  }

  /**
   * Get subscription plan for user
   */
  private async getSubscriptionPlan(
    userId: string
  ): Promise<'free' | 'pro' | 'team' | 'enterprise'> {
    try {
      const [subscriptionRecord] = await db
        .select({ plan: subscription.plan })
        .from(subscription)
        .where(eq(subscription.referenceId, userId))
        .limit(1)

      return (subscriptionRecord?.plan || 'free') as 'free' | 'pro' | 'team' | 'enterprise'
    } catch (error) {
      logger.error('Error getting subscription plan:', error)
      return 'free'
    }
  }
}
