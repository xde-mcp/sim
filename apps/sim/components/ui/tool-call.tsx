'use client'

import { useState } from 'react'
import { CheckCircle, ChevronDown, ChevronRight, Loader2, Settings, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import type { ToolCallGroup, ToolCallState } from '@/types/tool-call'

interface ToolCallProps {
  toolCall: ToolCallState
  isCompact?: boolean
}

interface ToolCallGroupProps {
  group: ToolCallGroup
  isCompact?: boolean
}

interface ToolCallIndicatorProps {
  type: 'status' | 'thinking' | 'execution'
  content: string
  toolNames?: string[]
}

// Detection State Component
export function ToolCallDetection({ content }: { content: string }) {
  return (
    <div className='flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm dark:border-blue-800 dark:bg-blue-950'>
      <Loader2 className='h-4 w-4 animate-spin text-blue-600 dark:text-blue-400' />
      <span className='text-blue-800 dark:text-blue-200'>{content}</span>
    </div>
  )
}

// Execution State Component
export function ToolCallExecution({ toolCall, isCompact = false }: ToolCallProps) {
  const [isExpanded, setIsExpanded] = useState(!isCompact)

  return (
    <div className='rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950'>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <Button
            variant='ghost'
            className='w-full justify-between p-3 hover:bg-amber-100 dark:hover:bg-amber-900'
          >
            <div className='flex items-center gap-2'>
              <Settings className='h-4 w-4 animate-pulse text-amber-600 dark:text-amber-400' />
              <span className='font-mono text-amber-800 text-sm dark:text-amber-200'>
                {toolCall.displayName || toolCall.name}
              </span>
              {toolCall.progress && (
                <Badge variant='outline' className='text-amber-700 text-xs dark:text-amber-300'>
                  {toolCall.progress}
                </Badge>
              )}
            </div>
            {isExpanded ? (
              <ChevronDown className='h-4 w-4 text-amber-600 dark:text-amber-400' />
            ) : (
              <ChevronRight className='h-4 w-4 text-amber-600 dark:text-amber-400' />
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className='px-3 pb-3'>
          <div className='space-y-2'>
            <div className='flex items-center gap-2 text-amber-700 text-xs dark:text-amber-300'>
              <Loader2 className='h-3 w-3 animate-spin' />
              <span>Executing...</span>
            </div>
            {toolCall.parameters && Object.keys(toolCall.parameters).length > 0 && (
              <div className='rounded bg-amber-100 p-2 dark:bg-amber-900'>
                <div className='mb-1 font-medium text-amber-800 text-xs dark:text-amber-200'>
                  Parameters:
                </div>
                <pre className='overflow-x-auto text-amber-700 text-xs dark:text-amber-300'>
                  {JSON.stringify(toolCall.parameters, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}

// Completion State Component
export function ToolCallCompletion({ toolCall, isCompact = false }: ToolCallProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const isSuccess = toolCall.state === 'completed'
  const isError = toolCall.state === 'error'

  const formatDuration = (duration?: number) => {
    if (!duration) return ''
    return duration < 1000 ? `${duration}ms` : `${(duration / 1000).toFixed(1)}s`
  }

  return (
    <div
      className={cn(
        'rounded-lg border',
        isSuccess && 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950',
        isError && 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950'
      )}
    >
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <Button
            variant='ghost'
            className={cn(
              'w-full justify-between p-3',
              isSuccess && 'hover:bg-green-100 dark:hover:bg-green-900',
              isError && 'hover:bg-red-100 dark:hover:bg-red-900'
            )}
          >
            <div className='flex items-center gap-2'>
              {isSuccess && <CheckCircle className='h-4 w-4 text-green-600 dark:text-green-400' />}
              {isError && <XCircle className='h-4 w-4 text-red-600 dark:text-red-400' />}
              <span
                className={cn(
                  'font-mono text-sm',
                  isSuccess && 'text-green-800 dark:text-green-200',
                  isError && 'text-red-800 dark:text-red-200'
                )}
              >
                {toolCall.displayName || toolCall.name}
              </span>
              {toolCall.duration && (
                <Badge
                  variant='outline'
                  className={cn(
                    'text-xs',
                    isSuccess && 'text-green-700 dark:text-green-300',
                    isError && 'text-red-700 dark:text-red-300'
                  )}
                >
                  {formatDuration(toolCall.duration)}
                </Badge>
              )}
            </div>
            <div className='flex items-center gap-2'>
              {!isCompact && (
                <span
                  className={cn(
                    'text-xs',
                    isSuccess && 'text-green-600 dark:text-green-400',
                    isError && 'text-red-600 dark:text-red-400'
                  )}
                >
                  {isSuccess ? 'Completed' : 'Failed'}
                </span>
              )}
              {isExpanded ? (
                <ChevronDown
                  className={cn(
                    'h-4 w-4',
                    isSuccess && 'text-green-600 dark:text-green-400',
                    isError && 'text-red-600 dark:text-red-400'
                  )}
                />
              ) : (
                <ChevronRight
                  className={cn(
                    'h-4 w-4',
                    isSuccess && 'text-green-600 dark:text-green-400',
                    isError && 'text-red-600 dark:text-red-400'
                  )}
                />
              )}
            </div>
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className='px-3 pb-3'>
          <div className='space-y-2'>
            {toolCall.parameters && Object.keys(toolCall.parameters).length > 0 && (
              <div
                className={cn(
                  'rounded p-2',
                  isSuccess && 'bg-green-100 dark:bg-green-900',
                  isError && 'bg-red-100 dark:bg-red-900'
                )}
              >
                <div
                  className={cn(
                    'mb-1 font-medium text-xs',
                    isSuccess && 'text-green-800 dark:text-green-200',
                    isError && 'text-red-800 dark:text-red-200'
                  )}
                >
                  Parameters:
                </div>
                <pre
                  className={cn(
                    'overflow-x-auto text-xs',
                    isSuccess && 'text-green-700 dark:text-green-300',
                    isError && 'text-red-700 dark:text-red-300'
                  )}
                >
                  {JSON.stringify(toolCall.parameters, null, 2)}
                </pre>
              </div>
            )}
            {toolCall.result && (
              <div
                className={cn(
                  'rounded p-2',
                  isSuccess && 'bg-green-100 dark:bg-green-900',
                  isError && 'bg-red-100 dark:bg-red-900'
                )}
              >
                <div
                  className={cn(
                    'mb-1 font-medium text-xs',
                    isSuccess && 'text-green-800 dark:text-green-200',
                    isError && 'text-red-800 dark:text-red-200'
                  )}
                >
                  Result:
                </div>
                <pre
                  className={cn(
                    'overflow-x-auto text-xs',
                    isSuccess && 'text-green-700 dark:text-green-300',
                    isError && 'text-red-700 dark:text-red-300'
                  )}
                >
                  {typeof toolCall.result === 'string'
                    ? toolCall.result
                    : JSON.stringify(toolCall.result, null, 2)}
                </pre>
              </div>
            )}
            {toolCall.error && (
              <div className='rounded bg-red-100 p-2 dark:bg-red-900'>
                <div className='mb-1 font-medium text-red-800 text-xs dark:text-red-200'>
                  Error:
                </div>
                <pre className='overflow-x-auto text-red-700 text-xs dark:text-red-300'>
                  {toolCall.error}
                </pre>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}

// Group Component for Multiple Tool Calls
export function ToolCallGroupComponent({ group, isCompact = false }: ToolCallGroupProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  const completedCount = group.toolCalls.filter((t) => t.state === 'completed').length
  const totalCount = group.toolCalls.length
  const isAllCompleted = completedCount === totalCount
  const hasErrors = group.toolCalls.some((t) => t.state === 'error')

  return (
    <div className='space-y-2'>
      {group.summary && (
        <div className='flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm dark:border-blue-800 dark:bg-blue-950'>
          <Settings className='h-4 w-4 text-blue-600 dark:text-blue-400' />
          <span className='text-blue-800 dark:text-blue-200'>{group.summary}</span>
          {!isAllCompleted && (
            <Badge variant='outline' className='text-blue-700 text-xs dark:text-blue-300'>
              {completedCount}/{totalCount}
            </Badge>
          )}
        </div>
      )}

      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <Button variant='ghost' className='w-full justify-between p-2 text-sm hover:bg-muted'>
            <div className='flex items-center gap-2'>
              <span className='text-muted-foreground'>
                {isAllCompleted ? 'Completed' : 'In Progress'} ({completedCount}/{totalCount})
              </span>
              {hasErrors && (
                <Badge variant='destructive' className='text-xs'>
                  Errors
                </Badge>
              )}
            </div>
            {isExpanded ? (
              <ChevronDown className='h-4 w-4 text-muted-foreground' />
            ) : (
              <ChevronRight className='h-4 w-4 text-muted-foreground' />
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className='space-y-2'>
          {group.toolCalls.map((toolCall) => (
            <div key={toolCall.id}>
              {toolCall.state === 'executing' && (
                <ToolCallExecution toolCall={toolCall} isCompact={isCompact} />
              )}
              {(toolCall.state === 'completed' || toolCall.state === 'error') && (
                <ToolCallCompletion toolCall={toolCall} isCompact={isCompact} />
              )}
            </div>
          ))}
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}

// Status Indicator Component
export function ToolCallIndicator({ type, content, toolNames }: ToolCallIndicatorProps) {
  if (type === 'status' && toolNames) {
    return (
      <div className='flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm dark:border-blue-800 dark:bg-blue-950'>
        <Loader2 className='h-4 w-4 animate-spin text-blue-600 dark:text-blue-400' />
        <span className='text-blue-800 dark:text-blue-200'>🔄 {toolNames.join(' • ')}</span>
      </div>
    )
  }

  return (
    <div className='flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm dark:border-blue-800 dark:bg-blue-950'>
      <Loader2 className='h-4 w-4 animate-spin text-blue-600 dark:text-blue-400' />
      <span className='text-blue-800 dark:text-blue-200'>{content}</span>
    </div>
  )
}
