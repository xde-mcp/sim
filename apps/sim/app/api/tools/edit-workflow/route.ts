import { eq } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logs/console-logger'
import { saveWorkflowToNormalizedTables } from '@/lib/workflows/db-helpers'
import { getBlock } from '@/blocks'
import { db } from '@/db'
import { workflow as workflowTable } from '@/db/schema'
import { convertYamlToWorkflow, parseWorkflowYaml } from '@/stores/workflows/yaml/importer'

const logger = createLogger('EditWorkflowAPI')

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { yamlContent, workflowId, description } = body

    if (!yamlContent) {
      return NextResponse.json(
        { success: false, error: 'yamlContent is required' },
        { status: 400 }
      )
    }

    if (!workflowId) {
      return NextResponse.json({ success: false, error: 'workflowId is required' }, { status: 400 })
    }

    logger.info('[edit-workflow] Processing workflow edit request', {
      workflowId,
      yamlLength: yamlContent.length,
      hasDescription: !!description,
    })

    // Parse YAML content server-side
    const { data: yamlWorkflow, errors: parseErrors } = parseWorkflowYaml(yamlContent)

    if (!yamlWorkflow || parseErrors.length > 0) {
      logger.error('[edit-workflow] YAML parsing failed', { parseErrors })
      return NextResponse.json({
        success: true,
        data: {
          success: false,
          message: 'Failed to parse YAML workflow',
          errors: parseErrors,
          warnings: [],
        },
      })
    }

    // Convert YAML to workflow format
    const { blocks, edges, errors: convertErrors, warnings } = convertYamlToWorkflow(yamlWorkflow)

    if (convertErrors.length > 0) {
      logger.error('[edit-workflow] YAML conversion failed', { convertErrors })
      return NextResponse.json({
        success: true,
        data: {
          success: false,
          message: 'Failed to convert YAML to workflow',
          errors: convertErrors,
          warnings,
        },
      })
    }

    // Create workflow state (same format as applyWorkflowDiff)
    const newWorkflowState: any = {
      blocks: {} as Record<string, any>,
      edges: [] as any[],
      loops: {} as Record<string, any>,
      parallels: {} as Record<string, any>,
      lastSaved: Date.now(),
      isDeployed: false,
      deployedAt: undefined,
      deploymentStatuses: {} as Record<string, any>,
      hasActiveSchedule: false,
      hasActiveWebhook: false,
    }

    // Process blocks and assign new IDs (complete replacement)
    const blockIdMapping = new Map<string, string>()

    for (const block of blocks) {
      const newId = crypto.randomUUID()
      blockIdMapping.set(block.id, newId)

      // Get block configuration to set proper defaults
      const blockConfig = getBlock(block.type)
      const subBlocks: Record<string, any> = {}
      const outputs: Record<string, any> = {}

      // Set up subBlocks from block configuration
      if (blockConfig?.subBlocks) {
        blockConfig.subBlocks.forEach((subBlock) => {
          subBlocks[subBlock.id] = {
            id: subBlock.id,
            type: subBlock.type,
            value: null,
          }
        })
      }

      // Set up outputs from block configuration
      if (blockConfig?.outputs) {
        if (Array.isArray(blockConfig.outputs)) {
          blockConfig.outputs.forEach((output) => {
            outputs[output.id] = { type: output.type }
          })
        } else if (typeof blockConfig.outputs === 'object') {
          Object.assign(outputs, blockConfig.outputs)
        }
      }

      newWorkflowState.blocks[newId] = {
        id: newId,
        type: block.type,
        name: block.name,
        position: block.position,
        subBlocks,
        outputs,
        enabled: true,
        horizontalHandles: true,
        isWide: false,
        height: 0,
        data: block.data || {},
      }

      // Set input values as subblock values
      if (block.inputs && typeof block.inputs === 'object') {
        Object.entries(block.inputs).forEach(([key, value]) => {
          if (newWorkflowState.blocks[newId].subBlocks[key]) {
            newWorkflowState.blocks[newId].subBlocks[key].value = value
          }
        })
      }
    }

    // Process edges with mapped IDs
    for (const edge of edges) {
      const sourceId = blockIdMapping.get(edge.source)
      const targetId = blockIdMapping.get(edge.target)

      if (sourceId && targetId) {
        newWorkflowState.edges.push({
          id: crypto.randomUUID(),
          source: sourceId,
          target: targetId,
          sourceHandle: edge.sourceHandle,
          targetHandle: edge.targetHandle,
          type: edge.type || 'default',
        })
      }
    }

    // Save directly to database using the same function as the workflow state API
    const saveResult = await saveWorkflowToNormalizedTables(workflowId, newWorkflowState)

    if (!saveResult.success) {
      logger.error('[edit-workflow] Failed to save workflow state:', saveResult.error)
      return NextResponse.json({
        success: true,
        data: {
          success: false,
          message: `Database save failed: ${saveResult.error || 'Unknown error'}`,
          errors: [saveResult.error || 'Database save failed'],
          warnings,
        },
      })
    }

    // Update workflow's lastSynced timestamp
    await db
      .update(workflowTable)
      .set({
        lastSynced: new Date(),
        updatedAt: new Date(),
        state: saveResult.jsonBlob, // Also update JSON blob for backward compatibility
      })
      .where(eq(workflowTable.id, workflowId))

    const result = {
      success: true,
      errors: [],
      warnings,
      summary: `Successfully created workflow with ${blocks.length} blocks and ${edges.length} connections.`,
    }

    logger.info('[edit-workflow] Import result', {
      success: result.success,
      errorCount: result.errors.length,
      warningCount: result.warnings.length,
      summary: result.summary,
    })

    return NextResponse.json({
      success: true,
      data: {
        success: result.success,
        message: result.success
          ? `Workflow updated successfully${description ? `: ${description}` : ''}`
          : 'Failed to update workflow',
        summary: result.summary,
        errors: result.errors,
        warnings: result.warnings,
      },
    })
  } catch (error) {
    logger.error('[edit-workflow] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: `Failed to edit workflow: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
      { status: 500 }
    )
  }
}
