import { createLogger } from '@/lib/logs/console-logger'

const logger = createLogger('YamlParsingUtils')

export interface ImportedEdge {
  id: string
  source: string
  target: string
  sourceHandle: string
  targetHandle: string
  type: string
}

export interface ParsedConnections {
  edges: ImportedEdge[]
  errors: string[]
  warnings: string[]
}

export interface ConnectionsFormat {
  // New format - grouped by handle type
  success?: string | string[]
  error?: string | string[]
  conditions?: Record<string, string | string[]>
  loop?: {
    start?: string | string[]
    end?: string | string[]
  }
  parallel?: {
    start?: string | string[]
    end?: string | string[]
  }
  // Legacy format support
  incoming?: Array<{
    source: string
    sourceHandle?: string
    targetHandle?: string
  }>
  outgoing?: Array<{
    target: string
    sourceHandle?: string
    targetHandle?: string
  }>
}

/**
 * Parse block connections from both new grouped format and legacy format
 */
export function parseBlockConnections(
  blockId: string,
  connections: ConnectionsFormat | undefined,
  blockType?: string
): ParsedConnections {
  const edges: ImportedEdge[] = []
  const errors: string[] = []
  const warnings: string[] = []

  if (!connections) {
    return { edges, errors, warnings }
  }

  // Handle new grouped format
  if (hasNewFormat(connections)) {
    parseNewFormatConnections(blockId, connections, edges, errors, warnings, blockType)
  }

  // Handle legacy format (for backwards compatibility)
  if (connections.outgoing) {
    parseLegacyOutgoingConnections(blockId, connections.outgoing, edges, errors, warnings)
  }

  return { edges, errors, warnings }
}

/**
 * Generate connections in the new grouped format from edges
 */
export function generateBlockConnections(
  blockId: string,
  edges: ImportedEdge[] | any[]
): ConnectionsFormat {
  const connections: ConnectionsFormat = {}

  const outgoingEdges = edges.filter((edge) => edge.source === blockId)

  if (outgoingEdges.length === 0) {
    return connections
  }

  // Group edges by source handle type
  const successTargets: string[] = []
  const errorTargets: string[] = []
  const conditionTargets: Record<string, string[]> = {}
  const loopTargets: { start: string[]; end: string[] } = { start: [], end: [] }
  const parallelTargets: { start: string[]; end: string[] } = { start: [], end: [] }

  for (const edge of outgoingEdges) {
    const handle = edge.sourceHandle ?? 'source'

    if (handle === 'source') {
      successTargets.push(edge.target)
    } else if (handle === 'error') {
      errorTargets.push(edge.target)
    } else if (handle.startsWith('condition-')) {
      const conditionId = extractConditionId(handle)
      if (!conditionTargets[conditionId]) {
        conditionTargets[conditionId] = []
      }
      conditionTargets[conditionId].push(edge.target)
    } else if (handle === 'loop-start-source') {
      loopTargets.start.push(edge.target)
    } else if (handle === 'loop-end-source') {
      loopTargets.end.push(edge.target)
    } else if (handle === 'parallel-start-source') {
      parallelTargets.start.push(edge.target)
    } else if (handle === 'parallel-end-source') {
      parallelTargets.end.push(edge.target)
    }
  }

  // Add to connections object (use single values for single targets, arrays for multiple)
  if (successTargets.length > 0) {
    connections.success = successTargets.length === 1 ? successTargets[0] : successTargets
  }

  if (errorTargets.length > 0) {
    connections.error = errorTargets.length === 1 ? errorTargets[0] : errorTargets
  }

  if (Object.keys(conditionTargets).length > 0) {
    connections.conditions = {}
    for (const [conditionId, targets] of Object.entries(conditionTargets)) {
      connections.conditions[conditionId] = targets.length === 1 ? targets[0] : targets
    }
  }

  if (loopTargets.start.length > 0 || loopTargets.end.length > 0) {
    connections.loop = {}
    if (loopTargets.start.length > 0) {
      connections.loop.start =
        loopTargets.start.length === 1 ? loopTargets.start[0] : loopTargets.start
    }
    if (loopTargets.end.length > 0) {
      connections.loop.end = loopTargets.end.length === 1 ? loopTargets.end[0] : loopTargets.end
    }
  }

  if (parallelTargets.start.length > 0 || parallelTargets.end.length > 0) {
    connections.parallel = {}
    if (parallelTargets.start.length > 0) {
      connections.parallel.start =
        parallelTargets.start.length === 1 ? parallelTargets.start[0] : parallelTargets.start
    }
    if (parallelTargets.end.length > 0) {
      connections.parallel.end =
        parallelTargets.end.length === 1 ? parallelTargets.end[0] : parallelTargets.end
    }
  }

  return connections
}

/**
 * Validate block structure (type, name, inputs)
 */
export function validateBlockStructure(
  blockId: string,
  block: any
): { errors: string[]; warnings: string[] } {
  const errors: string[] = []
  const warnings: string[] = []

  if (!block || typeof block !== 'object') {
    errors.push(`Invalid block definition for '${blockId}': must be an object`)
    return { errors, warnings }
  }

  if (!block.type || typeof block.type !== 'string') {
    errors.push(`Invalid block '${blockId}': missing or invalid 'type' field`)
  }

  if (!block.name || typeof block.name !== 'string') {
    errors.push(`Invalid block '${blockId}': missing or invalid 'name' field`)
  }

  if (block.inputs && typeof block.inputs !== 'object') {
    errors.push(`Invalid block '${blockId}': 'inputs' must be an object`)
  }

  return { errors, warnings }
}

/**
 * Clean up condition inputs to remove UI state and use semantic format
 */
export function cleanConditionInputs(
  blockId: string,
  inputs: Record<string, any>
): Record<string, any> {
  const cleanInputs = { ...inputs }

  // Handle condition blocks specially
  if (cleanInputs.conditions) {
    try {
      // Parse the JSON string conditions
      const conditions =
        typeof cleanInputs.conditions === 'string'
          ? JSON.parse(cleanInputs.conditions)
          : cleanInputs.conditions

      if (Array.isArray(conditions)) {
        // Convert to clean format
        const cleanConditions: Record<string, string> = {}

        conditions.forEach((condition: any) => {
          if (condition.title && condition.value !== undefined) {
            // Use semantic keys instead of UUIDs
            let key = condition.title
            if (condition.title === 'else if') {
              // Create a simple sequential else-if key
              const elseIfCount = Object.keys(cleanConditions).filter((k) =>
                k.startsWith('else-if')
              ).length
              key = elseIfCount === 0 ? 'else-if' : `else-if-${elseIfCount + 1}`
            }

            if (condition.value?.trim()) {
              cleanConditions[key] = condition.value.trim()
            }
          }
        })

        // Replace the verbose format with clean format
        if (Object.keys(cleanConditions).length > 0) {
          cleanInputs.conditions = cleanConditions
        } else {
          cleanInputs.conditions = undefined
        }
      }
    } catch (error) {
      // If parsing fails, leave as-is with a warning
      logger.warn(`Failed to clean condition inputs for block ${blockId}:`, error)
    }
  }

  return cleanInputs
}

/**
 * Convert clean condition inputs back to internal format for import
 */
export function expandConditionInputs(
  blockId: string,
  inputs: Record<string, any>
): Record<string, any> {
  const expandedInputs = { ...inputs }

  // Handle clean condition format
  if (
    expandedInputs.conditions &&
    typeof expandedInputs.conditions === 'object' &&
    !Array.isArray(expandedInputs.conditions)
  ) {
    const conditionsObj = expandedInputs.conditions as Record<string, string>
    const conditionsArray: any[] = []

    Object.entries(conditionsObj).forEach(([key, value]) => {
      const conditionId = `${blockId}-${key}`
      // Map semantic keys back to display titles
      const title = key.startsWith('else-if') ? 'else if' : key

      conditionsArray.push({
        id: conditionId,
        title: title,
        value: value || '',
        showTags: false,
        showEnvVars: false,
        searchTerm: '',
        cursorPosition: 0,
        activeSourceBlockId: null,
      })
    })

    // Add default else if not present
    if (!conditionsObj.else) {
      conditionsArray.push({
        id: `${blockId}-else`,
        title: 'else',
        value: '',
        showTags: false,
        showEnvVars: false,
        searchTerm: '',
        cursorPosition: 0,
        activeSourceBlockId: null,
      })
    }

    expandedInputs.conditions = JSON.stringify(conditionsArray)
  }

  return expandedInputs
}

/**
 * Validate that block references in connections exist
 */
export function validateBlockReferences(blocks: Record<string, any>): string[] {
  const errors: string[] = []
  const blockIds = new Set(Object.keys(blocks))

  Object.entries(blocks).forEach(([blockId, block]) => {
    if (!block.connections) return

    const { edges } = parseBlockConnections(blockId, block.connections, block.type)

    edges.forEach((edge) => {
      if (!blockIds.has(edge.target)) {
        errors.push(`Block '${blockId}' references non-existent target block '${edge.target}'`)
      }
    })

    // Check parent references
    if (block.parentId && !blockIds.has(block.parentId)) {
      errors.push(`Block '${blockId}' references non-existent parent block '${block.parentId}'`)
    }
  })

  return errors
}

// Helper functions

function hasNewFormat(connections: ConnectionsFormat): boolean {
  return !!(
    connections.success ||
    connections.error ||
    connections.conditions ||
    connections.loop ||
    connections.parallel
  )
}

function parseNewFormatConnections(
  blockId: string,
  connections: ConnectionsFormat,
  edges: ImportedEdge[],
  errors: string[],
  warnings: string[],
  blockType?: string
) {
  // Parse success connections
  if (connections.success) {
    const targets = Array.isArray(connections.success) ? connections.success : [connections.success]
    targets.forEach((target) => {
      if (typeof target === 'string') {
        edges.push(createEdge(blockId, target, 'source', 'target'))
      } else {
        errors.push(`Invalid success target in block '${blockId}': must be a string`)
      }
    })
  }

  // Parse error connections
  if (connections.error) {
    const targets = Array.isArray(connections.error) ? connections.error : [connections.error]
    targets.forEach((target) => {
      if (typeof target === 'string') {
        edges.push(createEdge(blockId, target, 'error', 'target'))
      } else {
        errors.push(`Invalid error target in block '${blockId}': must be a string`)
      }
    })
  }

  // Parse condition connections
  if (connections.conditions) {
    if (typeof connections.conditions !== 'object') {
      errors.push(`Invalid conditions in block '${blockId}': must be an object`)
    } else {
      Object.entries(connections.conditions).forEach(([conditionId, targets]) => {
        const targetArray = Array.isArray(targets) ? targets : [targets]
        targetArray.forEach((target) => {
          if (typeof target === 'string') {
            // Create condition handle based on block type and condition ID
            const sourceHandle = createConditionHandle(blockId, conditionId, blockType)
            edges.push(createEdge(blockId, target, sourceHandle, 'target'))
          } else {
            errors.push(
              `Invalid condition target for '${conditionId}' in block '${blockId}': must be a string`
            )
          }
        })
      })
    }
  }

  // Parse loop connections
  if (connections.loop) {
    if (typeof connections.loop !== 'object') {
      errors.push(`Invalid loop connections in block '${blockId}': must be an object`)
    } else {
      if (connections.loop.start) {
        const targets = Array.isArray(connections.loop.start)
          ? connections.loop.start
          : [connections.loop.start]
        targets.forEach((target) => {
          if (typeof target === 'string') {
            edges.push(createEdge(blockId, target, 'loop-start-source', 'target'))
          } else {
            errors.push(`Invalid loop start target in block '${blockId}': must be a string`)
          }
        })
      }

      if (connections.loop.end) {
        const targets = Array.isArray(connections.loop.end)
          ? connections.loop.end
          : [connections.loop.end]
        targets.forEach((target) => {
          if (typeof target === 'string') {
            edges.push(createEdge(blockId, target, 'loop-end-source', 'target'))
          } else {
            errors.push(`Invalid loop end target in block '${blockId}': must be a string`)
          }
        })
      }
    }
  }

  // Parse parallel connections
  if (connections.parallel) {
    if (typeof connections.parallel !== 'object') {
      errors.push(`Invalid parallel connections in block '${blockId}': must be an object`)
    } else {
      if (connections.parallel.start) {
        const targets = Array.isArray(connections.parallel.start)
          ? connections.parallel.start
          : [connections.parallel.start]
        targets.forEach((target) => {
          if (typeof target === 'string') {
            edges.push(createEdge(blockId, target, 'parallel-start-source', 'target'))
          } else {
            errors.push(`Invalid parallel start target in block '${blockId}': must be a string`)
          }
        })
      }

      if (connections.parallel.end) {
        const targets = Array.isArray(connections.parallel.end)
          ? connections.parallel.end
          : [connections.parallel.end]
        targets.forEach((target) => {
          if (typeof target === 'string') {
            edges.push(createEdge(blockId, target, 'parallel-end-source', 'target'))
          } else {
            errors.push(`Invalid parallel end target in block '${blockId}': must be a string`)
          }
        })
      }
    }
  }
}

function parseLegacyOutgoingConnections(
  blockId: string,
  outgoing: Array<{ target: string; sourceHandle?: string; targetHandle?: string }>,
  edges: ImportedEdge[],
  errors: string[],
  warnings: string[]
) {
  warnings.push(
    `Block '${blockId}' uses legacy connection format - consider upgrading to the new grouped format`
  )

  outgoing.forEach((connection) => {
    if (!connection.target) {
      errors.push(`Missing target in outgoing connection for block '${blockId}'`)
      return
    }

    edges.push(
      createEdge(
        blockId,
        connection.target,
        connection.sourceHandle || 'source',
        connection.targetHandle || 'target'
      )
    )
  })
}

function createEdge(
  source: string,
  target: string,
  sourceHandle: string,
  targetHandle: string
): ImportedEdge {
  return {
    id: crypto.randomUUID(),
    source,
    target,
    sourceHandle,
    targetHandle,
    type: 'workflowEdge',
  }
}

function createConditionHandle(blockId: string, conditionId: string, blockType?: string): string {
  // For condition blocks, create the handle format that the system expects
  if (blockType === 'condition') {
    // Map semantic condition IDs to the internal format the system expects
    const actualConditionId = `${blockId}-${conditionId}`
    return `condition-${actualConditionId}`
  }
  // For other blocks that might have conditions, use a more explicit format
  return `condition-${blockId}-${conditionId}`
}

function extractConditionId(sourceHandle: string): string {
  // Extract condition ID from handle like "condition-blockId-semantic-key"
  // Example: "condition-e23e6318-bcdc-4572-a76b-5015e3950121-else-if-2"

  if (!sourceHandle.startsWith('condition-')) {
    return sourceHandle
  }

  // Remove "condition-" prefix
  const withoutPrefix = sourceHandle.substring('condition-'.length)

  // Find the first UUID pattern (36 characters with 4 hyphens in specific positions)
  // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-(.+)$/
  const match = withoutPrefix.match(uuidRegex)

  if (match) {
    // Extract everything after the UUID
    return match[1]
  }

  // Fallback for legacy format or simpler cases
  const parts = sourceHandle.split('-')
  if (parts.length >= 2) {
    return parts[parts.length - 1]
  }

  return sourceHandle
}
