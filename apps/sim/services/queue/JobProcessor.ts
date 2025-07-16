import { and, eq, inArray, lt, sql } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'
import { createLogger } from '@/lib/logs/console-logger'
import { EnhancedLoggingSession } from '@/lib/logs/enhanced-logging-session'
import { buildTraceSpans } from '@/lib/logs/trace-spans'
import { decryptSecret } from '@/lib/utils'
import { loadWorkflowFromNormalizedTables } from '@/lib/workflows/db-helpers'
import { updateWorkflowRunCounts } from '@/lib/workflows/utils'
import { db } from '@/db'
import {
  environment as environmentTable,
  userStats,
  workflow,
  workflowExecutionJobs,
} from '@/db/schema'
import { Executor } from '@/executor'
import { Serializer } from '@/serializer'
import { mergeSubblockState } from '@/stores/workflows/server-utils'
import { JobQueueService } from './JobQueueService'
import { RateLimiter } from './RateLimiter'
import type { WorkflowExecutionJob } from './types'
import { SYSTEM_LIMITS } from './types'

const logger = createLogger('JobProcessor')

export class JobProcessor {
  private isRunning = false
  private activeJobs = new Map<string, NodeJS.Timeout>()
  private jobQueue: JobQueueService
  private rateLimiter: RateLimiter
  private cleanupInterval?: NodeJS.Timeout
  private processorId: string

  constructor() {
    this.jobQueue = new JobQueueService()
    this.rateLimiter = new RateLimiter()
    this.processorId = uuidv4().slice(0, 8)
    logger.info(`JobProcessor created with ID: ${this.processorId}`)
  }

  /**
   * Start processing jobs
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn(`[${this.processorId}] Job processor is already running`)
      return
    }

    logger.info(`[${this.processorId}] Starting job processor...`)
    this.isRunning = true

    // Clean up stuck jobs on startup
    logger.info(`[${this.processorId}] Cleaning up stuck processing jobs...`)
    const stuckJobs = await db
      .update(workflowExecutionJobs)
      .set({
        status: 'failed',
        error: 'Job processor restarted, marking stuck job as failed',
        completedAt: new Date(),
      })
      .where(eq(workflowExecutionJobs.status, 'processing'))
      .returning({ id: workflowExecutionJobs.id })

    if (stuckJobs.length > 0) {
      logger.info(`Cleaned up ${stuckJobs.length} stuck processing jobs`)
    }

    // Run cleanup task
    logger.info('Running job cleanup...')
    await this.performCleanup()

    // Start cleanup task - runs every hour
    this.cleanupInterval = setInterval(() => {
      this.performCleanup()
    }, 3600000) // 1 hour

    // Start the processing loop
    this.processLoop()
  }

  /**
   * Stop processing jobs
   */
  async stop(): Promise<void> {
    logger.info('Stopping job processor...')
    this.isRunning = false

    // Clear cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = undefined
    }

    // Cancel all active jobs
    for (const [jobId, timeout] of this.activeJobs) {
      clearTimeout(timeout)
      await this.jobQueue.markJobFailed(jobId, 'Job processor stopped', false)
    }
    this.activeJobs.clear()
  }

  /**
   * Perform cleanup of old jobs
   */
  private async performCleanup(): Promise<void> {
    try {
      logger.info('Running job cleanup...')

      const daysToKeep = Number.parseInt(process.env.JOB_RETENTION_DAYS || '1')
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

      const deletedJobs = await db
        .delete(workflowExecutionJobs)
        .where(
          and(
            inArray(workflowExecutionJobs.status, ['completed', 'failed', 'cancelled']),
            lt(workflowExecutionJobs.completedAt, cutoffDate)
          )
        )
        .returning({ id: workflowExecutionJobs.id })

      const deletedCount = deletedJobs.length
      if (deletedCount > 0) {
        logger.info(`Cleaned up ${deletedCount} old jobs`)
      }
    } catch (error) {
      logger.error('Error during job cleanup:', error)
    }
  }

  /**
   * Main processing loop
   */
  private async processLoop(): Promise<void> {
    logger.info(`[${this.processorId}] Job processor loop started`)

    while (this.isRunning) {
      try {
        // Check if we're at capacity
        if (this.activeJobs.size >= SYSTEM_LIMITS.maxJobProcessors) {
          logger.debug(
            `[${this.processorId}] At capacity: ${this.activeJobs.size}/${SYSTEM_LIMITS.maxJobProcessors} jobs`
          )
          await new Promise((resolve) => setTimeout(resolve, 1000))
          continue
        }

        // Get next job from queue
        const job = await this.jobQueue.getNextJob()
        if (!job) {
          // No jobs, wait a bit
          await new Promise((resolve) => setTimeout(resolve, 2000))
          continue
        }

        logger.info(`[${this.processorId}] Found job ${job.id}, attempting to process...`)

        // Note: Per-user concurrency limits removed - only system-level limits apply

        // Try to mark job as processing (atomic operation)
        const marked = await this.jobQueue.markJobProcessing(job.id)
        if (!marked) {
          // Another processor got it first
          logger.info(`[${this.processorId}] Job ${job.id} already taken by another processor`)
          continue
        }

        logger.info(
          `[${this.processorId}] Successfully claimed job ${job.id}, starting processing...`
        )

        // Process the job
        this.processJob(job)
      } catch (error) {
        logger.error('Error in process loop:', error)
        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, 5000))
      }
    }

    logger.info('Job processor loop stopped')
  }

  /**
   * Process a single job
   */
  private async processJob(job: WorkflowExecutionJob): Promise<void> {
    const executionId = uuidv4()
    const requestId = job.id.slice(0, 8)

    logger.info(`Processing job ${job.id} for workflow ${job.workflowId}`, {
      executionId,
      userId: job.userId,
      triggerType: job.triggerType,
    })

    // Update job with execution ID
    await db
      .update(workflowExecutionJobs)
      .set({ executionId })
      .where(eq(workflowExecutionJobs.id, job.id))

    // Set timeout for job execution
    const timeout = setTimeout(async () => {
      this.activeJobs.delete(job.id)
      await this.jobQueue.markJobFailed(
        job.id,
        'Execution timeout exceeded',
        true // Allow retry
      )
    }, SYSTEM_LIMITS.maxExecutionTime)

    this.activeJobs.set(job.id, timeout)

    try {
      // Execute the workflow
      const result = await this.executeWorkflow(
        job.workflowId,
        job.userId,
        job.input,
        executionId,
        requestId,
        job.metadata
      )

      // Clear timeout
      clearTimeout(timeout)
      this.activeJobs.delete(job.id)

      // Mark job as completed
      await this.jobQueue.markJobCompleted(job.id, result.output, executionId)

      logger.info(`Job ${job.id} completed successfully`)
    } catch (error: any) {
      // Clear timeout
      clearTimeout(timeout)
      this.activeJobs.delete(job.id)

      const errorMessage = error.message || 'Unknown error'
      logger.error(`Job ${job.id} failed:`, {
        error: errorMessage,
        stack: error.stack,
        workflowId: job.workflowId,
        userId: job.userId,
      })

      // Check if we should retry
      const shouldRetry = !errorMessage.includes('Usage limit exceeded')
      await this.jobQueue.markJobFailed(job.id, errorMessage, shouldRetry)
    }
  }

  /**
   * Execute a workflow (extracted from the original execute endpoint)
   */
  private async executeWorkflow(
    workflowId: string,
    userId: string,
    input: any,
    executionId: string,
    requestId: string,
    metadata?: any
  ): Promise<any> {
    const loggingSession = new EnhancedLoggingSession(
      workflowId,
      executionId,
      metadata?.triggerType || 'api',
      requestId
    )

    try {
      // Load workflow
      const [workflowRecord] = await db
        .select()
        .from(workflow)
        .where(eq(workflow.id, workflowId))
        .limit(1)

      if (!workflowRecord) {
        throw new Error('Workflow not found')
      }

      // Load workflow data from normalized tables
      const normalizedData = await loadWorkflowFromNormalizedTables(workflowId)
      if (!normalizedData) {
        throw new Error(`Workflow ${workflowId} has no normalized data available`)
      }

      const { blocks, edges, loops, parallels } = normalizedData
      const mergedStates = mergeSubblockState(blocks)

      // Get user's environment variables
      const [userEnv] = await db
        .select()
        .from(environmentTable)
        .where(eq(environmentTable.userId, userId))
        .limit(1)

      const variables = (userEnv?.variables || {}) as Record<string, string>

      await loggingSession.safeStart({
        userId,
        workspaceId: workflowRecord.workspaceId || '',
        variables,
      })

      // Extract current block states
      const currentBlockStates = Object.entries(mergedStates).reduce(
        (acc, [blockId, blockState]) => {
          if ((blockState as any).subBlocks) {
            const subBlocks = (blockState as any).subBlocks
            acc[blockId] = Object.entries(subBlocks).reduce(
              (subAcc, [key, subBlock]) => {
                subAcc[key] = (subBlock as any).value
                return subAcc
              },
              {} as Record<string, any>
            )
          }
          return acc
        },
        {} as Record<string, Record<string, any>>
      )

      // Decrypt environment variables
      const decryptedEnvVars: Record<string, string> = {}
      for (const [key, encryptedValue] of Object.entries(variables)) {
        try {
          const { decrypted } = await decryptSecret(encryptedValue as string)
          decryptedEnvVars[key] = decrypted
        } catch (error: any) {
          logger.error(`Failed to decrypt environment variable "${key}"`, error)
          throw new Error(`Failed to decrypt environment variable "${key}": ${error.message}`)
        }
      }

      // Process block states (parse response formats, etc)
      const processedBlockStates = Object.entries(currentBlockStates).reduce(
        (acc, [blockId, blockState]) => {
          if (blockState.responseFormat && typeof blockState.responseFormat === 'string') {
            try {
              const parsedResponseFormat = JSON.parse(blockState.responseFormat)
              acc[blockId] = {
                ...blockState,
                responseFormat: parsedResponseFormat,
              }
            } catch (error) {
              logger.warn(`Failed to parse responseFormat for block ${blockId}`, error)
              acc[blockId] = blockState
            }
          } else {
            acc[blockId] = blockState
          }
          return acc
        },
        {} as Record<string, Record<string, any>>
      )

      // Get workflow variables
      let workflowVariables = {}
      if (workflowRecord.variables) {
        try {
          if (typeof workflowRecord.variables === 'string') {
            workflowVariables = JSON.parse(workflowRecord.variables)
          } else {
            workflowVariables = workflowRecord.variables
          }
        } catch (error) {
          logger.error(`Failed to parse workflow variables: ${workflowId}`, error)
        }
      }

      // Serialize and execute
      const serializedWorkflow = new Serializer().serializeWorkflow(
        mergedStates,
        edges,
        loops,
        parallels
      )

      const executor = new Executor(
        serializedWorkflow,
        processedBlockStates,
        decryptedEnvVars,
        input || {},
        workflowVariables
      )

      loggingSession.setupExecutor(executor)

      const result = await executor.execute(workflowId)
      const executionResult =
        'stream' in result && 'execution' in result ? result.execution : result

      // Build trace spans
      const { traceSpans, totalDuration } = buildTraceSpans(executionResult)

      // Update workflow run counts on success
      if (executionResult.success) {
        await updateWorkflowRunCounts(workflowId)

        // Track execution in user stats
        const statsUpdate =
          metadata?.triggerType === 'api'
            ? { totalApiCalls: sql`total_api_calls + 1` }
            : metadata?.triggerType === 'webhook'
              ? { totalWebhookTriggers: sql`total_webhook_triggers + 1` }
              : metadata?.triggerType === 'schedule'
                ? { totalScheduledExecutions: sql`total_scheduled_executions + 1` }
                : { totalManualExecutions: sql`total_manual_executions + 1` }

        await db
          .update(userStats)
          .set({
            ...statsUpdate,
            lastActive: sql`now()`,
          })
          .where(eq(userStats.userId, userId))
      }

      await loggingSession.safeComplete({
        endedAt: new Date().toISOString(),
        totalDurationMs: totalDuration || 0,
        finalOutput: executionResult.output || {},
        traceSpans: (traceSpans || []) as any,
      })

      return executionResult
    } catch (error: any) {
      logger.error(`Workflow execution failed: ${workflowId}`, error)

      await loggingSession.safeCompleteWithError({
        endedAt: new Date().toISOString(),
        totalDurationMs: 0,
        error: {
          message: error.message || 'Workflow execution failed',
          stackTrace: error.stack,
        },
      })

      throw error
    }
  }
}
