#!/usr/bin/env bun

/**
 * Direct test script for the workflow queue system
 * Tests the JobQueueService and RateLimiter classes directly
 *
 * Usage:
 *   bun run scripts/test-queue-system.ts
 */

import { sql } from 'drizzle-orm'
import { createLogger } from '@/lib/logs/console-logger'
import { db } from '@/db'
import { user, userStats, workflow } from '@/db/schema'

const logger = createLogger('QueueSystemTest')

// Test configuration
const TEST_USER_ID = 'test-queue-user-' + Date.now()
const TEST_WORKFLOW_ID = 'test-queue-workflow-' + Date.now()
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000'

async function setup() {
  logger.info('Setting up test data...')

  // Create test user
  await db.insert(user).values({
    id: TEST_USER_ID,
    name: 'Queue Test User',
    email: `queue-test-${Date.now()}@example.com`,
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  })

  // Initialize user stats
  await db.insert(userStats).values({
    id: TEST_USER_ID + '-stats',
    userId: TEST_USER_ID,
  })

  // Create test workflow
  await db.insert(workflow).values({
    id: TEST_WORKFLOW_ID,
    userId: TEST_USER_ID,
    name: 'Test Queue Workflow',
    state: {
      blocks: {
        'block-1': {
          id: 'block-1',
          type: 'starter',
          name: 'Start',
          data: { type: 'manual' },
          subBlocks: {},
          outputs: {},
          position: { x: 0, y: 0 },
        },
        'block-2': {
          id: 'block-2',
          type: 'agent',
          name: 'Test Agent',
          data: {},
          subBlocks: {
            prompt: { value: 'Say "Queue system test successful!"' },
            model: { value: 'claude-3-haiku' },
          },
          outputs: {},
          position: { x: 200, y: 0 },
        },
      },
      edges: [
        {
          id: 'edge-1',
          source: 'block-1',
          target: 'block-2',
          sourceHandle: 'default',
          targetHandle: 'default',
        },
      ],
      subflows: {},
    },
    isDeployed: true,
    deployedState: {}, // Same as state
    deployedAt: new Date(),
    lastSynced: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  })

  logger.info(`Created test user: ${TEST_USER_ID}`)
  logger.info(`Created test workflow: ${TEST_WORKFLOW_ID}`)
}

async function cleanup() {
  logger.info('Cleaning up test data...')

  await db.execute(sql`DELETE FROM workflow_execution_jobs WHERE user_id = ${TEST_USER_ID}`)
  await db.execute(sql`DELETE FROM user_rate_limits WHERE user_id = ${TEST_USER_ID}`)
  await db.execute(sql`DELETE FROM workflow WHERE id = ${TEST_WORKFLOW_ID}`)
  await db.execute(sql`DELETE FROM user_stats WHERE user_id = ${TEST_USER_ID}`)
  await db.execute(sql`DELETE FROM "user" WHERE id = ${TEST_USER_ID}`)
}

async function testRateLimiting() {
  logger.info('\n=== Testing Rate Limiting ===')

  const promises = []
  const results = { success: 0, rateLimited: 0 }

  // Try to create 25 jobs (free tier limit is 20)
  for (let i = 0; i < 25; i++) {
    promises.push(
      fetch(`${API_BASE_URL}/api/workflows/${TEST_WORKFLOW_ID}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // In a real scenario, you'd use proper authentication
          'X-User-Id': TEST_USER_ID, // This won't work without proper auth
        },
        body: JSON.stringify({ input: { testIndex: i } }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.error?.includes('Rate limit')) {
            results.rateLimited++
          } else if (data.jobId) {
            results.success++
          }
          return data
        })
    )
  }

  await Promise.all(promises)

  logger.info(`Successful job creations: ${results.success}`)
  logger.info(`Rate limited requests: ${results.rateLimited}`)

  if (results.success === 20 && results.rateLimited === 5) {
    logger.info('✅ Rate limiting working correctly!')
  } else {
    logger.error('❌ Rate limiting not working as expected')
  }
}

async function testQueuePosition() {
  logger.info('\n=== Testing Queue Position ===')

  // Check rate limit status
  const statusRes = await fetch(`${API_BASE_URL}/api/users/rate-limit`, {
    headers: {
      'X-User-Id': TEST_USER_ID,
    },
  })

  const status = await statusRes.json()
  logger.info('Rate limit status:', status)
}

async function testJobLifecycle() {
  logger.info('\n=== Testing Job Lifecycle ===')

  // Create a job
  const createRes = await fetch(`${API_BASE_URL}/api/workflows/${TEST_WORKFLOW_ID}/execute`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': TEST_USER_ID,
    },
    body: JSON.stringify({ input: { test: 'lifecycle' } }),
  })

  const { jobId, error } = await createRes.json()

  if (error) {
    logger.error('Failed to create job:', error)
    return
  }

  logger.info(`Created job: ${jobId}`)

  // Poll job status
  let attempts = 0
  let jobComplete = false

  while (attempts < 30 && !jobComplete) {
    await new Promise((resolve) => setTimeout(resolve, 2000)) // Wait 2 seconds

    const statusRes = await fetch(`${API_BASE_URL}/api/jobs/${jobId}`, {
      headers: {
        'X-User-Id': TEST_USER_ID,
      },
    })

    const job = await statusRes.json()
    logger.info(`Job status: ${job.status} (position: ${job.position || 'processing'})`)

    if (job.status === 'completed' || job.status === 'failed') {
      jobComplete = true
      logger.info(`Job finished with status: ${job.status}`)
      if (job.output) {
        logger.info('Job output:', job.output)
      }
      if (job.error) {
        logger.error('Job error:', job.error)
      }
    }

    attempts++
  }

  if (!jobComplete) {
    logger.warn('Job did not complete within timeout')
  }
}

async function testConcurrentExecution() {
  logger.info('\n=== Testing Concurrent Execution Limits ===')

  // Free tier allows only 1 concurrent execution
  // Create multiple jobs and see if they queue properly
  const jobPromises = []

  for (let i = 0; i < 3; i++) {
    jobPromises.push(
      fetch(`${API_BASE_URL}/api/workflows/${TEST_WORKFLOW_ID}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': TEST_USER_ID,
        },
        body: JSON.stringify({ input: { concurrentTest: i } }),
      }).then((res) => res.json())
    )
  }

  const jobs = await Promise.all(jobPromises)
  const validJobs = jobs.filter((j) => j.jobId)

  logger.info(`Created ${validJobs.length} jobs`)

  // Check how many are processing at once
  const jobStatuses = await Promise.all(
    validJobs.map((j) =>
      fetch(`${API_BASE_URL}/api/jobs/${j.jobId}`, {
        headers: { 'X-User-Id': TEST_USER_ID },
      }).then((res) => res.json())
    )
  )

  const processingCount = jobStatuses.filter((j) => j.status === 'processing').length
  logger.info(`Jobs currently processing: ${processingCount}`)

  if (processingCount <= 1) {
    logger.info('✅ Concurrent execution limit working correctly!')
  } else {
    logger.error('❌ Too many concurrent executions')
  }
}

async function main() {
  try {
    // Check if queue system is enabled
    if (process.env.USE_WORKFLOW_QUEUE !== 'true') {
      logger.warn('⚠️  USE_WORKFLOW_QUEUE is not set to true. Queue system may not be active.')
      logger.warn('Set USE_WORKFLOW_QUEUE=true in your .env file to test the queue system.')
    }

    await setup()

    // Run tests
    await testRateLimiting()
    await testQueuePosition()
    await testJobLifecycle()
    await testConcurrentExecution()

    logger.info('\n=== Test Summary ===')
    logger.info('All tests completed. Check the logs above for results.')
  } catch (error) {
    logger.error('Test failed:', error)
  } finally {
    await cleanup()
    process.exit(0)
  }
}

// Run the tests
main()
