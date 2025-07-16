'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CopyButton } from '@/components/ui/copy-button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'

interface ExampleCommandProps {
  command: string
  apiKey: string
  endpoint: string
  showLabel?: boolean
}

type ExampleMode = 'sync' | 'async'
type ExampleType = 'execute' | 'status' | 'rate-limits'

export function ExampleCommand({
  command,
  apiKey,
  endpoint,
  showLabel = true,
}: ExampleCommandProps) {
  const [mode, setMode] = useState<ExampleMode>('sync')
  const [exampleType, setExampleType] = useState<ExampleType>('execute')

  // Format the curl command to use a placeholder for the API key
  const formatCurlCommand = (command: string, apiKey: string) => {
    if (!command.includes('curl')) return command

    // Replace the actual API key with a placeholder in the command
    const sanitizedCommand = command.replace(apiKey, 'SIM_API_KEY')

    // Format the command with line breaks for better readability
    return sanitizedCommand
      .replace(' -H ', '\n  -H ')
      .replace(' -d ', '\n  -d ')
      .replace(' http', '\n  http')
  }

  const getExampleCommand = () => {
    const baseEndpoint = endpoint.replace(apiKey, 'SIM_API_KEY')

    switch (mode) {
      case 'sync':
        return formatCurlCommand(command, apiKey)

      case 'async':
        switch (exampleType) {
          case 'execute':
            return `curl -X POST \\
  -H "X-API-Key: SIM_API_KEY" \\
  -H "Content-Type: application/json" \\
  -H "X-Execution-Mode: async" \\
  -d '{"input": "your data here"}' \\
  ${baseEndpoint}`

          case 'status':
            return `# First, run async execution to get jobId
curl -X POST \\
  -H "X-API-Key: SIM_API_KEY" \\
  -H "Content-Type: application/json" \\
  -H "X-Execution-Mode: async" \\
  -d '{"input": "your data here"}' \\
  ${baseEndpoint}

# Then check status using the jobId from response
curl -H "X-API-Key: SIM_API_KEY" \\
  ${baseEndpoint.replace('/execute', '').replace('/api/workflows/', '/api/jobs/')}/JOB_ID_HERE`

          case 'rate-limits':
            return `# Check your current rate limit status
curl -H "X-API-Key: SIM_API_KEY" \\
  ${baseEndpoint.replace('/api/workflows/', '/api/users/').replace('/execute', '/rate-limit')}`

          default:
            return formatCurlCommand(command, apiKey)
        }

      default:
        return formatCurlCommand(command, apiKey)
    }
  }

  const getExampleTitle = () => {
    if (mode === 'sync') {
      return 'Synchronous Execution'
    }

    switch (exampleType) {
      case 'execute':
        return 'Async Execution'
      case 'status':
        return 'Check Job Status'
      case 'rate-limits':
        return 'Rate Limits & Usage'
      default:
        return 'Async Mode'
    }
  }

  return (
    <div className='space-y-1.5'>
      {showLabel && (
        <div className='flex items-center justify-between'>
          <Label className='font-medium text-sm'>Example Commands</Label>
          <div className='flex items-center gap-2'>
            {/* Mode Toggle */}
            <div className='flex rounded-md border bg-background p-1'>
              <Button
                variant={mode === 'sync' ? 'default' : 'ghost'}
                size='sm'
                className='h-7 px-3 text-xs'
                onClick={() => setMode('sync')}
              >
                Sync
              </Button>
              <Button
                variant={mode === 'async' ? 'default' : 'ghost'}
                size='sm'
                className='h-7 px-3 text-xs'
                onClick={() => setMode('async')}
              >
                Async
              </Button>
            </div>

            {/* Async Mode Dropdown */}
            {mode === 'async' && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant='outline' size='sm' className='h-7 px-3 text-xs'>
                    {getExampleTitle()}
                    <ChevronDown className='ml-1 h-3 w-3' />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align='end'>
                  <DropdownMenuItem onClick={() => setExampleType('execute')}>
                    Async Execution
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setExampleType('status')}>
                    Check Job Status
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setExampleType('rate-limits')}>
                    Rate Limits & Usage
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      )}

      <div className='group relative rounded-md border bg-background transition-colors hover:bg-muted/50'>
        <pre className='overflow-x-auto whitespace-pre-wrap p-3 font-mono text-xs'>
          {getExampleCommand()}
        </pre>
        <CopyButton text={getExampleCommand()} />
      </div>
    </div>
  )
}
