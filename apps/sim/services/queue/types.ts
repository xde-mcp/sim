import type { InferInsertModel, InferSelectModel } from 'drizzle-orm'
import type { userRateLimits, workflowExecutionJobs } from '@/db/schema'

// Database types
export type WorkflowExecutionJob = InferSelectModel<typeof workflowExecutionJobs>
export type NewWorkflowExecutionJob = InferInsertModel<typeof workflowExecutionJobs>
export type UserRateLimit = InferSelectModel<typeof userRateLimits>

// Job status types
export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
export type TriggerType = 'api' | 'webhook' | 'schedule' | 'manual' | 'chat'

// Default priority for all jobs
export const DEFAULT_PRIORITY = 50

// Rate limit configuration (applies to all non-manual trigger types: api, webhook, schedule, chat)
export interface RateLimitConfig {
  syncApiExecutionsPerMinute: number
  asyncApiExecutionsPerMinute: number
}

export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  free: {
    syncApiExecutionsPerMinute: 10,
    asyncApiExecutionsPerMinute: 50,
  },
  pro: {
    syncApiExecutionsPerMinute: 25,
    asyncApiExecutionsPerMinute: 200,
  },
  team: {
    syncApiExecutionsPerMinute: 75,
    asyncApiExecutionsPerMinute: 500,
  },
  enterprise: {
    syncApiExecutionsPerMinute: 150,
    asyncApiExecutionsPerMinute: 1000,
  },
}

// System limits
export const SYSTEM_LIMITS = {
  maxSyncConcurrentExecutions: 30, // Conservative for DB connections
  maxAsyncConcurrentExecutions: 50, // Higher for async
  maxQueueDepth: 1000,
  maxExecutionTime: 300_000, // 5 minutes
  maxJobProcessors: 10,
  targetQueueTime: 5000, // Target 5s queue wait
  retryDelayMs: [1000, 5000, 30000], // Retry delays: 1s, 5s, 30s
}

// Job creation options
export interface CreateJobOptions {
  workflowId: string
  userId: string
  input?: any
  priority?: number
  triggerType?: TriggerType
  metadata?: Record<string, any>
}

// Job result
export interface JobResult {
  jobId: string
  status: JobStatus
  createdAt: Date
  estimatedStartTime?: Date
  position?: number
  output?: any
  error?: string
  completedAt?: Date
  executionId?: string
}

// Rate limit status
export interface RateLimitStatus {
  isLimited: boolean
  limit: number
  remaining: number
  resetAt: Date
  currentUsage: number
}
