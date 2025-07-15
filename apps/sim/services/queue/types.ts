import type { InferInsertModel, InferSelectModel } from 'drizzle-orm'
import type { userRateLimits, workflowExecutionJobs } from '@/db/schema'

// Database types
export type WorkflowExecutionJob = InferSelectModel<typeof workflowExecutionJobs>
export type NewWorkflowExecutionJob = InferInsertModel<typeof workflowExecutionJobs>
export type UserRateLimit = InferSelectModel<typeof userRateLimits>

// Job status types
export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
export type TriggerType = 'api' | 'webhook' | 'schedule' | 'manual'

// Priority levels (kept for potential future use, but defaulting everything to NORMAL)
export const PRIORITY_LEVELS = {
  LOW: 0,
  NORMAL: 50,
  HIGH: 100,
  CRITICAL: 200,
} as const

// Default priority for all jobs
export const DEFAULT_PRIORITY = PRIORITY_LEVELS.NORMAL

// Rate limit configuration
export interface RateLimitConfig {
  executionsPerHour: number
  concurrentExecutions: number
  burstLimit: number // Max executions in 1 minute
}

export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  free: {
    executionsPerHour: 20,
    concurrentExecutions: 1,
    burstLimit: 3,
  },
  pro: {
    executionsPerHour: 200,
    concurrentExecutions: 3,
    burstLimit: 10,
  },
  team: {
    executionsPerHour: 1000,
    concurrentExecutions: 5,
    burstLimit: 25,
  },
  enterprise: {
    executionsPerHour: 5000,
    concurrentExecutions: 10,
    burstLimit: 100,
  },
}

// System limits
export const SYSTEM_LIMITS = {
  maxConcurrentExecutions: 50,
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
