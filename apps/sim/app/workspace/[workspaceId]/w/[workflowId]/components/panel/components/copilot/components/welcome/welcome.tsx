'use client'

import { Bot } from 'lucide-react'

export function CopilotWelcome() {
  return (
    <div className='flex h-full flex-col items-center justify-center px-4 py-10'>
      <div className='space-y-4 text-center'>
        <Bot className='mx-auto h-12 w-12 text-muted-foreground' />
        <div className='space-y-2'>
          <h3 className='font-medium text-lg'>How can I help you today?</h3>
          <p className='text-muted-foreground text-sm'>
            Ask me anything about your workflows, available tools, or how to get started.
          </p>
        </div>
        <div className='mx-auto max-w-xs space-y-2 text-left'>
          <div className='text-muted-foreground text-xs'>Try asking:</div>
          <div className='space-y-1'>
            <div className='rounded bg-muted/50 px-2 py-1 text-xs'>
              "How do I create a workflow?"
            </div>
            <div className='rounded bg-muted/50 px-2 py-1 text-xs'>"What tools are available?"</div>
            <div className='rounded bg-muted/50 px-2 py-1 text-xs'>
              "Help me with my current workflow"
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
