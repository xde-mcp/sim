import { task } from '@trigger.dev/sdk/v3'
import { eq } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'
import { decryptSecret } from '@/lib/utils'
import { loadWorkflowFromNormalizedTables } from '@/lib/workflows/db-helpers'
import { db } from '@/db'
import { environment as environmentTable } from '@/db/schema'
import { Executor } from '@/executor'
import { Serializer } from '@/serializer'
import { mergeSubblockState } from '@/stores/workflows/server-utils'

export const workflowExecution = task({
  id: 'workflow-execution',
  retry: {
    maxAttempts: 1,
  },
  run: async (payload: {
    workflowId: string
    userId: string
    input?: any
    triggerType?: string
    metadata?: Record<string, any>
  }) => {
    const workflowId = payload.workflowId
    const executionId = uuidv4()
    const requestId = executionId.slice(0, 8)

    try {
      // Debug: Check database connection
      console.log('Database URL available:', !!process.env.DATABASE_URL)
      console.log('Loading workflow:', workflowId)

      // Load workflow data from normalized tables
      const normalizedData = await loadWorkflowFromNormalizedTables(workflowId)
      if (!normalizedData) {
        console.error('Workflow not found in normalized tables:', workflowId)
        throw new Error(`Workflow ${workflowId} data not found in normalized tables`)
      }

      console.log('Workflow loaded successfully:', workflowId)

      const { blocks, edges, loops, parallels } = normalizedData

      // Merge subblock states (server-safe version doesn't need workflowId)
      const mergedStates = mergeSubblockState(blocks, {})

      // Process block states for execution
      const processedBlockStates = Object.entries(mergedStates).reduce(
        (acc, [blockId, blockState]) => {
          acc[blockId] = Object.entries(blockState.subBlocks).reduce(
            (subAcc, [key, subBlock]) => {
              subAcc[key] = subBlock.value
              return subAcc
            },
            {} as Record<string, any>
          )
          return acc
        },
        {} as Record<string, Record<string, any>>
      )

      // Get environment variables
      const [userEnv] = await db
        .select()
        .from(environmentTable)
        .where(eq(environmentTable.userId, payload.userId))
        .limit(1)

      let decryptedEnvVars: Record<string, string> = {}
      if (userEnv) {
        const decryptionPromises = Object.entries((userEnv.variables as any) || {}).map(
          async ([key, encryptedValue]) => {
            try {
              const { decrypted } = await decryptSecret(encryptedValue as string)
              return [key, decrypted] as const
            } catch (error: any) {
              console.error(`Failed to decrypt environment variable "${key}":`, error)
              throw new Error(`Failed to decrypt environment variable "${key}": ${error.message}`)
            }
          }
        )

        const decryptedPairs = await Promise.all(decryptionPromises)
        decryptedEnvVars = Object.fromEntries(decryptedPairs)
      }

      // Create serialized workflow
      const serializer = new Serializer()
      const serializedWorkflow = serializer.serializeWorkflow(
        mergedStates,
        edges,
        loops || {},
        parallels || {}
      )

      // Create executor and execute
      const executor = new Executor(
        serializedWorkflow,
        processedBlockStates,
        decryptedEnvVars,
        payload.input || {},
        {} // workflow variables
      )

      const result = await executor.execute(workflowId)

      // Handle streaming vs regular result
      const executionResult =
        'stream' in result && 'execution' in result ? result.execution : result

      console.log('Workflow execution completed:', {
        workflowId: payload.workflowId,
        success: executionResult.success,
        executionId,
      })

      return {
        success: executionResult.success,
        workflowId: payload.workflowId,
        executionId,
        output: executionResult.output,
        executedAt: new Date().toISOString(),
        metadata: payload.metadata,
      }
    } catch (error: any) {
      console.error('Workflow execution failed:', {
        workflowId: payload.workflowId,
        error: error.message,
        stack: error.stack,
      })

      throw error // Let Trigger.dev handle retries
    }
  },
})
