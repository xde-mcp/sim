import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { AlertCircle, Check, ChevronDown, ChevronUp, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getBlock } from '@/blocks'
import type { ConsoleEntry as ConsoleEntryType } from '@/stores/panel/console/types'
import { JSONView } from '../json-view/json-view'

interface ConsoleEntryProps {
  entry: ConsoleEntryType
  consoleWidth: number
}

export function ConsoleEntry({ entry, consoleWidth }: ConsoleEntryProps) {
  const [isExpanded, setIsExpanded] = useState(true) // Default expanded
  const [showCopySuccess, setShowCopySuccess] = useState(false)

  const blockConfig = useMemo(() => {
    if (!entry.blockType) return null
    return getBlock(entry.blockType)
  }, [entry.blockType])

  const handleCopy = () => {
    const stringified = JSON.stringify(entry.output, null, 2)
    navigator.clipboard.writeText(stringified)
    setShowCopySuccess(true)
  }

  useEffect(() => {
    if (showCopySuccess) {
      const timer = setTimeout(() => {
        setShowCopySuccess(false)
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [showCopySuccess])

  const BlockIcon = blockConfig?.icon
  const blockColor = blockConfig?.bgColor || '#6B7280'

  return (
    <div className='space-y-3'>
      {/* Header: Icon | Block name */}
      <div className='flex items-center gap-2'>
        {BlockIcon && (
          <div
            className='flex h-5 w-5 items-center justify-center rounded-md'
            style={{ backgroundColor: blockColor }}
          >
            <BlockIcon className='h-3 w-3 text-white' />
          </div>
        )}
        <span className='font-normal text-base text-sm leading-normal'>
          {entry.blockName || 'Unknown Block'}
        </span>
      </div>

      {/* Duration tag | Time tag */}
      <div className='flex items-center gap-2'>
        <div
          className={`flex h-5 items-center rounded-lg px-2 ${
            entry.error ? 'bg-[#F6D2D2] dark:bg-[#442929]' : 'bg-secondary'
          }`}
        >
          {entry.error ? (
            <div className='flex items-center gap-1'>
              <AlertCircle className='h-3 w-3 text-[#DC2626] dark:text-[#F87171]' />
              <span className='font-normal text-[#DC2626] text-xs leading-normal dark:text-[#F87171]'>
                Error
              </span>
            </div>
          ) : (
            <span className='font-normal text-muted-foreground text-xs leading-normal'>
              {entry.durationMs ?? 0}ms
            </span>
          )}
        </div>
        <div className='flex h-5 items-center rounded-lg bg-secondary px-2'>
          <span className='font-normal text-muted-foreground text-xs leading-normal'>
            {entry.startedAt ? format(new Date(entry.startedAt), 'HH:mm:ss') : 'N/A'}
          </span>
        </div>
      </div>

      {/* Response area */}
      <div className='space-y-2 pb-2'>
        {/* Error display */}
        {entry.error && (
          <div className='rounded-lg bg-[#F6D2D2] p-3 dark:bg-[#442929]'>
            <div className='overflow-hidden whitespace-pre-wrap break-all font-normal text-[#DC2626] text-sm leading-normal dark:text-[#F87171]'>
              {entry.error}
            </div>
          </div>
        )}

        {/* Warning display */}
        {entry.warning && (
          <div className='rounded-lg border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800/50'>
            <div className='mb-1 font-normal text-sm text-yellow-800 leading-normal dark:text-yellow-200'>
              Warning
            </div>
            <div className='overflow-hidden whitespace-pre-wrap break-all font-normal text-sm text-yellow-700 leading-normal dark:text-yellow-300'>
              {entry.warning}
            </div>
          </div>
        )}

        {/* Success output */}
        {!entry.error && !entry.warning && entry.output != null && (
          <div className='rounded-lg bg-secondary/50 p-3'>
            <div className='relative'>
              {/* Copy and Expand/Collapse buttons */}
              <div className='absolute top-[-2.8] right-0 z-10 flex items-center gap-1'>
                <Button
                  variant='ghost'
                  size='sm'
                  className='h-6 w-6 p-0 hover:bg-transparent'
                  onClick={handleCopy}
                >
                  {showCopySuccess ? (
                    <Check className='h-3 w-3 text-gray-500' />
                  ) : (
                    <Copy className='h-3 w-3 text-muted-foreground' />
                  )}
                </Button>
                <Button
                  variant='ghost'
                  size='sm'
                  className='h-6 w-6 p-0 hover:bg-transparent'
                  onClick={() => setIsExpanded(!isExpanded)}
                >
                  {isExpanded ? (
                    <ChevronUp className='h-3 w-3 text-muted-foreground' />
                  ) : (
                    <ChevronDown className='h-3 w-3 text-muted-foreground' />
                  )}
                </Button>
              </div>
              
              {/* Content */}
              {isExpanded ? (
                <div className='max-w-full overflow-hidden break-all font-mono font-normal text-muted-foreground text-sm leading-normal'>
                  <JSONView data={entry.output} />
                </div>
              ) : (
                <div
                  className='max-w-full cursor-pointer overflow-hidden break-all font-mono font-normal text-muted-foreground text-sm leading-normal'
                  onClick={() => setIsExpanded(true)}
                >
                  {'{...}'}
                </div>
              )}
            </div>
          </div>
        )}

        {/* No output message */}
        {!entry.error && !entry.warning && entry.output == null && (
          <div className='rounded-lg bg-secondary/50 p-3'>
            <div className='text-center font-normal text-muted-foreground text-sm leading-normal'>
              No output
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
