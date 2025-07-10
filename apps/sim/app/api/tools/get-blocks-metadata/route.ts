import { type NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logs/console-logger'
import { registry as blockRegistry } from '@/blocks/registry'
import { tools as toolsRegistry } from '@/tools/registry'

const logger = createLogger('GetBlockMetadataAPI')

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { blockIds } = body

    if (!blockIds || !Array.isArray(blockIds)) {
      return NextResponse.json(
        {
          success: false,
          error: 'blockIds must be an array of block IDs',
        },
        { status: 400 }
      )
    }

    logger.info('Getting block metadata', {
      blockIds,
      blockCount: blockIds.length,
      requestedBlocks: blockIds.join(', '),
    })

    // Create result object mapping block_id -> {description, longDescription, category, inputs, outputs, subBlocks, tools}
    const result: Record<
      string,
      {
        description: string
        longDescription?: string
        category: string
        inputs?: Record<string, any>
        outputs?: Record<string, any>
        subBlocks?: any[]
        tools: Record<string, { description: string; params?: Record<string, any> }>
      }
    > = {}

    for (const blockId of blockIds) {
      const blockConfig = blockRegistry[blockId]

      if (!blockConfig) {
        logger.warn(`Block not found: ${blockId}`)
        continue
      }

      // Get block metadata
      const blockDescription = blockConfig.description || ''
      const blockLongDescription = blockConfig.longDescription
      const blockCategory = blockConfig.category || ''
      const blockInputs = blockConfig.inputs
      const blockOutputs = blockConfig.outputs
      const blockSubBlocks = blockConfig.subBlocks

      // Get tool metadata for this block
      const toolMetadata: Record<string, { description: string; params?: Record<string, any> }> = {}
      const blockTools = blockConfig.tools?.access || []

      for (const toolId of blockTools) {
        const toolConfig = toolsRegistry[toolId]
        if (toolConfig) {
          toolMetadata[toolId] = {
            description: toolConfig.description || '',
            params: toolConfig.params,
          }
        } else {
          logger.warn(`Tool not found: ${toolId} for block: ${blockId}`)
          toolMetadata[toolId] = {
            description: '',
          }
        }
      }

      result[blockId] = {
        description: blockDescription,
        longDescription: blockLongDescription,
        category: blockCategory,
        inputs: blockInputs,
        outputs: blockOutputs,
        subBlocks: blockSubBlocks,
        tools: toolMetadata,
      }
    }

    const processedBlocks = Object.keys(result).length
    const requestedBlocks = blockIds.length
    const notFoundBlocks = requestedBlocks - processedBlocks

    logger.info(`Successfully processed ${processedBlocks} block descriptions`, {
      requestedBlocks,
      processedBlocks,
      notFoundBlocks,
      result,
    })

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    logger.error('Get block descriptions failed', error)
    return NextResponse.json(
      {
        success: false,
        error: `Failed to get block descriptions: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
      { status: 500 }
    )
  }
}
