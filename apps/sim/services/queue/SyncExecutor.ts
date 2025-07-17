import { createLogger } from '@/lib/logs/console-logger'

const logger = createLogger('SyncExecutor')

interface SyncTask {
  id: string
  workflowId: string
  userId: string
  input: any
  execute: () => Promise<any>
  resolve: (value: any) => void
  reject: (error: any) => void
  enqueueTime: number
}

export class SyncExecutor {
  private queue: SyncTask[] = []
  private activeExecutions = 0
  private readonly maxConcurrent: number
  private readonly maxQueueSize: number
  private readonly maxWaitTime: number
  private readonly maxExecutionTime: number
  private isShuttingDown = false
  private statsInterval?: NodeJS.Timeout

  constructor(
    options: {
      maxConcurrent?: number
      maxQueueSize?: number
      maxWaitTime?: number
      maxExecutionTime?: number
    } = {}
  ) {
    this.maxConcurrent = options.maxConcurrent || 35
    this.maxQueueSize = options.maxQueueSize || 150000 // 150k queue depth
    this.maxWaitTime = options.maxWaitTime || 300000 // 5 minutes
    this.maxExecutionTime = options.maxExecutionTime || 120000 // 2 minutes

    // Start periodic stats logging
    this.startStatsLogging()
  }

  private startStatsLogging() {
    // Log stats every 30 seconds
    this.statsInterval = setInterval(() => {
      const stats = this.getStats()
      if (stats.total > 0 || stats.utilization > 0) {
        logger.info('Sync queue stats', stats)
      }
    }, 30000)
  }

  async execute<T>(
    workflowId: string,
    userId: string,
    input: any,
    executeFn: () => Promise<T>
  ): Promise<T> {
    if (this.isShuttingDown) {
      throw new Error('Service is shutting down')
    }

    // Check queue depth
    if (this.queue.length >= this.maxQueueSize) {
      logger.warn('Sync queue full', {
        queueSize: this.queue.length,
        maxSize: this.maxQueueSize,
        active: this.activeExecutions,
      })
      throw new Error('Service overloaded. Please try again later.')
    }

    return new Promise<T>((resolve, reject) => {
      const taskId = crypto.randomUUID()
      const task: SyncTask = {
        id: taskId,
        workflowId,
        userId,
        input,
        execute: executeFn,
        resolve,
        reject,
        enqueueTime: Date.now(),
      }

      // Add to queue
      this.queue.push(task)

      logger.debug('Task enqueued', {
        taskId,
        workflowId,
        queuePosition: this.queue.length,
        active: this.activeExecutions,
      })

      // Set timeout
      const timeoutId = setTimeout(() => {
        const index = this.queue.indexOf(task)
        if (index !== -1) {
          this.queue.splice(index, 1)
          reject(new Error('Request timeout - server too busy'))
          logger.warn('Task timed out in queue', {
            taskId,
            workflowId,
            waitTime: Date.now() - task.enqueueTime,
          })
        }
      }, this.maxWaitTime)

      // Store timeout so we can clear it

      ;(task as any).timeoutId = timeoutId

      // Try to process immediately
      this.processQueue()
    })
  }

  private async processQueue() {
    // Check if we can process more
    while (
      this.queue.length > 0 &&
      this.activeExecutions < this.maxConcurrent &&
      !this.isShuttingDown
    ) {
      const task = this.queue.shift()
      if (!task) break

      // Clear timeout
      clearTimeout((task as any).timeoutId)

      // Check if already timed out
      const waitTime = Date.now() - task.enqueueTime
      if (waitTime > this.maxWaitTime) {
        task.reject(new Error('Request timeout - waited too long'))
        continue
      }

      this.activeExecutions++

      logger.debug('Task starting', {
        taskId: task.id,
        workflowId: task.workflowId,
        waitTime,
        active: this.activeExecutions,
      })

      // Execute the task
      this.executeTask(task)
    }
  }

  private async executeTask(task: SyncTask) {
    const startTime = Date.now()

    try {
      // Create a timeout promise that rejects after maxExecutionTime
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Sync execution timeout exceeded (${this.maxExecutionTime}ms)`))
        }, this.maxExecutionTime)
      })

      // Race the task execution against the timeout
      const result = await Promise.race([task.execute(), timeoutPromise])
      const duration = Date.now() - startTime

      logger.debug('Task completed', {
        taskId: task.id,
        workflowId: task.workflowId,
        duration,
        waitTime: startTime - task.enqueueTime,
      })

      task.resolve(result)
    } catch (error) {
      const duration = Date.now() - startTime

      logger.error('Task failed', {
        taskId: task.id,
        workflowId: task.workflowId,
        duration,
        error: error instanceof Error ? error.message : 'Unknown error',
      })

      task.reject(error)
    } finally {
      this.activeExecutions--
      // Process next in queue
      this.processQueue()
    }
  }

  getStats() {
    return {
      active: this.activeExecutions,
      queued: this.queue.length,
      total: this.activeExecutions + this.queue.length,
      maxConcurrent: this.maxConcurrent,
      maxQueueSize: this.maxQueueSize,
      maxWaitTime: this.maxWaitTime,
      maxExecutionTime: this.maxExecutionTime,
      utilization: Math.round((this.activeExecutions / this.maxConcurrent) * 100),
    }
  }

  async shutdown(timeoutMs = 5000): Promise<void> {
    logger.info('Shutting down sync executor', this.getStats())
    this.isShuttingDown = true

    // Clear stats interval
    if (this.statsInterval) {
      clearInterval(this.statsInterval)
    }

    // Reject all queued tasks
    while (this.queue.length > 0) {
      const task = this.queue.shift()
      if (task) {
        clearTimeout((task as any).timeoutId)
        task.reject(new Error('Service shutting down'))
      }
    }

    // Wait for active executions to complete
    const shutdownStart = Date.now()
    while (this.activeExecutions > 0 && Date.now() - shutdownStart < timeoutMs) {
      await new Promise((resolve) => setTimeout(resolve, 100))
    }

    if (this.activeExecutions > 0) {
      logger.warn('Shutdown timeout - some tasks still running', {
        active: this.activeExecutions,
      })
    } else {
      logger.info('Sync executor shut down cleanly')
    }
  }
}

// Global instance
export const syncExecutor = new SyncExecutor()
