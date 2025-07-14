'use client'

import { useMemo } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { getBlock } from '@/blocks'
import type { SubBlockConfig } from '@/blocks/types'
import { useBlockDetailsStore } from '@/stores/panel/block-details/store'
import { useWorkflowRegistry } from '@/stores/workflows/registry/store'
import { mergeSubblockState } from '@/stores/workflows/utils'
import { useWorkflowStore } from '@/stores/workflows/workflow/store'
import { SubBlock } from '../../../workflow-block/components/sub-block/sub-block'

export function BlockDetails() {
  const { selectedBlockId } = useBlockDetailsStore()
  const { activeWorkflowId } = useWorkflowRegistry()
  const { blocks } = useWorkflowStore()

  const selectedBlock = selectedBlockId ? blocks[selectedBlockId] : null

  // Ensure blockId is a string for components that need it
  const blockId = selectedBlockId || ''

  // Group subblocks logic from workflow-block.tsx
  const groupSubBlocks = useMemo(() => {
    if (!selectedBlock || !selectedBlockId) return []

    const blockConfig = getBlock(selectedBlock.type)
    if (!blockConfig) return []

    const subBlocks = blockConfig.subBlocks
    const rows: SubBlockConfig[][] = []
    let currentRow: SubBlockConfig[] = []
    let currentRowWidth = 0

    // Get merged state for conditional evaluation (selectedBlockId is guaranteed to be non-null here)
    const mergedState = mergeSubblockState(blocks, activeWorkflowId || undefined, blockId)[blockId]
    const stateToUse = mergedState?.subBlocks || {}

    const isAdvancedMode = blocks[blockId]?.advancedMode ?? false

    // Filter visible blocks and those that meet their conditions
    const visibleSubBlocks = subBlocks.filter((block) => {
      if (block.hidden) return false

      // Filter by mode if specified
      if (block.mode) {
        if (block.mode === 'basic' && isAdvancedMode) return false
        if (block.mode === 'advanced' && !isAdvancedMode) return false
      }

      // If there's no condition, the block should be shown
      if (!block.condition) return true

      // Get the values of the fields this block depends on
      const fieldValue = stateToUse[block.condition.field]?.value
      const andFieldValue = block.condition.and
        ? stateToUse[block.condition.and.field]?.value
        : undefined

      // Check if the condition value is an array
      const isValueMatch = Array.isArray(block.condition.value)
        ? fieldValue != null &&
          (block.condition.not
            ? !block.condition.value.includes(fieldValue as string | number | boolean)
            : block.condition.value.includes(fieldValue as string | number | boolean))
        : block.condition.not
          ? fieldValue !== block.condition.value
          : fieldValue === block.condition.value

      // Check both conditions if 'and' is present
      const isAndValueMatch =
        !block.condition.and ||
        (Array.isArray(block.condition.and.value)
          ? andFieldValue != null &&
            (block.condition.and.not
              ? !block.condition.and.value.includes(andFieldValue as string | number | boolean)
              : block.condition.and.value.includes(andFieldValue as string | number | boolean))
          : block.condition.and.not
            ? andFieldValue !== block.condition.and.value
            : andFieldValue === block.condition.and.value)

      return isValueMatch && isAndValueMatch
    })

    visibleSubBlocks.forEach((block) => {
      const blockWidth = block.layout === 'half' ? 0.5 : 1
      if (currentRowWidth + blockWidth > 1) {
        if (currentRow.length > 0) {
          rows.push([...currentRow])
        }
        currentRow = [block]
        currentRowWidth = blockWidth
      } else {
        currentRow.push(block)
        currentRowWidth += blockWidth
      }
    })

    if (currentRow.length > 0) {
      rows.push(currentRow)
    }

    return rows
  }, [selectedBlock, selectedBlockId, blocks, activeWorkflowId, blockId])

  const blockConfig = selectedBlock ? getBlock(selectedBlock.type) : null

  if (!selectedBlock || !blockConfig) {
    return (
      <div className='flex h-full items-center justify-center text-muted-foreground text-sm'>
        No block selected
      </div>
    )
  }

  return (
    <div className='h-full pt-2 pl-[1px]'>
      <ScrollArea className='h-full' hideScrollbar={true}>
        <div className='space-y-4'>
          {/* Render subblocks */}
          {groupSubBlocks.length > 0 ? (
            groupSubBlocks.map((row, rowIndex) => (
              <div key={`row-${rowIndex}`} className='flex gap-4'>
                {row.map((subBlock, blockIndex) => (
                  <div
                    key={`${blockId}-${rowIndex}-${blockIndex}`}
                    className={`space-y-1 ${subBlock.layout === 'half' ? 'flex-1' : 'w-full'}`}
                  >
                    <SubBlock
                      blockId={blockId}
                      config={subBlock}
                      isConnecting={false}
                      isPreview={false}
                      disabled={false}
                    />
                  </div>
                ))}
              </div>
            ))
          ) : (
            <div className='flex items-center justify-center text-muted-foreground text-sm'>
              No configuration options available
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
