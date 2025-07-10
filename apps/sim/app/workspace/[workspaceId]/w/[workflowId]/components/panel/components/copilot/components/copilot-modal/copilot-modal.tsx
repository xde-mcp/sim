'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown, History, MessageSquarePlus, MoreHorizontal, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { CopilotChat } from '@/lib/copilot/api'
import { createLogger } from '@/lib/logs/console-logger'
import { useSidebarStore } from '@/stores/sidebar/store'
import type { CopilotMessage } from '@/stores/copilot/types'
import { CheckpointPanel } from '../checkpoint-panel'
import { ProfessionalInput } from '../professional-input/professional-input'
import { ProfessionalMessage } from '../professional-message/professional-message'
import { CopilotWelcome } from '../welcome/welcome'

const logger = createLogger('CopilotModal')

interface CopilotModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  copilotMessage: string
  setCopilotMessage: (message: string) => void
  messages: CopilotMessage[]
  onSendMessage: (message: string) => Promise<void>
  isLoading: boolean
  // Chat management props
  chats: CopilotChat[]
  currentChat: CopilotChat | null
  onSelectChat: (chat: CopilotChat) => void
  onStartNewChat: () => void
  onDeleteChat: (chatId: string) => void
  // Mode props
  mode: 'ask' | 'agent'
  onModeChange: (mode: 'ask' | 'agent') => void
}

export function CopilotModal({
  open,
  onOpenChange,
  copilotMessage,
  setCopilotMessage,
  messages,
  onSendMessage,
  isLoading,
  chats,
  currentChat,
  onSelectChat,
  onStartNewChat,
  onDeleteChat,
  mode,
  onModeChange,
}: CopilotModalProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [showCheckpoints, setShowCheckpoints] = useState(false)
  
  // Get sidebar state to determine left position
  const { mode: sidebarMode, isExpanded } = useSidebarStore()
  
  // Calculate sidebar width based on mode and state
  const sidebarWidth = 
    sidebarMode === 'collapsed' || (sidebarMode === 'hover' && !isExpanded) 
      ? 56 // w-14 (collapsed)
      : 240 // w-60 (expanded)

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  if (!open) return null

  return (
    <div 
      className='fixed inset-y-0 right-0 z-[100] flex flex-col bg-background'
      style={{ left: `${sidebarWidth}px` }}
    >
      <style jsx>{`
        @keyframes growShrink {
          0%,
          100% {
            transform: scale(0.9);
          }
          50% {
            transform: scale(1.1);
          }
        }
        .loading-dot {
          animation: growShrink 1.5s infinite ease-in-out;
        }
      `}</style>

      {/* Header with chat title, management, and close button */}
      <div className='flex items-center justify-between border-b px-4 py-3'>
        <div className='flex flex-1 items-center gap-2'>
          {/* Chat Title Dropdown */}
          <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant='ghost'
                className='h-8 max-w-[300px] flex-1 justify-start px-3 hover:bg-accent/50'
              >
                <span className='truncate'>{currentChat?.title || 'New Chat'}</span>
                <ChevronDown className='ml-2 h-4 w-4 shrink-0' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align='start'
              className='z-[110] w-72 border-border/50 bg-background/95 shadow-lg backdrop-blur-sm'
              sideOffset={8}
              onMouseLeave={() => setIsDropdownOpen(false)}
            >
              {chats.length === 0 ? (
                <div className='px-4 py-3 text-muted-foreground text-sm'>No chats yet</div>
              ) : (
                // Sort chats by updated date (most recent first) for display
                [...chats]
                  .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                  .map((chat) => (
                    <div key={chat.id} className='group flex items-center gap-2 px-2 py-1'>
                      <DropdownMenuItem asChild>
                        <div
                          onClick={() => {
                            onSelectChat(chat)
                            setIsDropdownOpen(false)
                          }}
                          className={`min-w-0 flex-1 cursor-pointer rounded-lg px-3 py-2.5 transition-all ${
                            currentChat?.id === chat.id
                              ? 'bg-accent/80 text-accent-foreground'
                              : 'hover:bg-accent/40'
                          }`}
                        >
                          <div className='min-w-0'>
                            <div className='truncate font-medium text-sm leading-tight'>
                              {chat.title || 'Untitled Chat'}
                            </div>
                            <div className='mt-0.5 truncate text-muted-foreground text-xs'>
                              {new Date(chat.updatedAt).toLocaleDateString()} at{' '}
                              {new Date(chat.updatedAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}{' '}
                              • {chat.messageCount}
                            </div>
                          </div>
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant='ghost'
                            size='sm'
                            className='h-7 w-7 shrink-0 p-0 hover:bg-accent/60'
                          >
                            <MoreHorizontal className='h-3.5 w-3.5' />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align='end'
                          className='z-[120] border-border/50 bg-background/95 shadow-lg backdrop-blur-sm'
                        >
                          <DropdownMenuItem
                            onClick={() => onDeleteChat(chat.id)}
                            className='cursor-pointer text-destructive hover:bg-destructive/10 hover:text-destructive focus:bg-destructive/10 focus:text-destructive'
                          >
                            <Trash2 className='mr-2 h-3.5 w-3.5' />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Checkpoint Toggle Button */}
          <Button
            variant='ghost'
            size='sm'
            onClick={() => setShowCheckpoints(!showCheckpoints)}
            className={`h-8 w-8 p-0 ${
              showCheckpoints
                ? 'bg-[#802FFF]/20 text-[#802FFF] hover:bg-[#802FFF]/30'
                : 'hover:bg-accent/50'
            }`}
            title='View Checkpoints'
          >
            <History className='h-4 w-4' />
          </Button>

          {/* New Chat Button */}
          <Button
            variant='ghost'
            size='sm'
            onClick={onStartNewChat}
            className='h-8 w-8 p-0'
            title='New Chat'
          >
            <MessageSquarePlus className='h-4 w-4' />
          </Button>
        </div>

        <Button
          variant='ghost'
          size='icon'
          className='h-8 w-8 rounded-md hover:bg-accent/50'
          onClick={() => onOpenChange(false)}
        >
          <X className='h-4 w-4' />
          <span className='sr-only'>Close</span>
        </Button>
      </div>

      {/* Messages container or Checkpoint Panel */}
      {showCheckpoints ? (
        <div className='flex-1 overflow-hidden'>
          <CheckpointPanel />
        </div>
      ) : (
        <div ref={messagesContainerRef} className='flex-1 overflow-y-auto'>
          <div className='mx-auto max-w-3xl'>
            {messages.length === 0 ? (
              <CopilotWelcome onQuestionClick={onSendMessage} mode={mode} />
            ) : (
              messages.map((message) => (
                <ProfessionalMessage
                  key={message.id}
                  message={message}
                  isStreaming={isLoading && message.id === messages[messages.length - 1]?.id}
                />
              ))
            )}

            <div ref={messagesEndRef} className='h-1' />
          </div>
        </div>
      )}

      {/* Mode Selector and Input (only show when not viewing checkpoints) */}
      {!showCheckpoints && (
        <>
          {/* Mode Selector */}
          <div className='border-t px-4 py-2'>
            <div className='mx-auto max-w-3xl'>
              <div className='flex items-center gap-1 rounded-md border bg-muted/30 p-0.5'>
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => onModeChange('ask')}
                  className={`h-6 flex-1 font-medium text-xs ${
                    mode === 'ask'
                      ? 'bg-[#802FFF]/20 text-[#802FFF] hover:bg-[#802FFF]/30'
                      : 'hover:bg-muted/50'
                  }`}
                  title='Ask questions and get answers. Cannot edit workflows.'
                >
                  Ask
                </Button>
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => onModeChange('agent')}
                  className={`h-6 flex-1 font-medium text-xs ${
                    mode === 'agent'
                      ? 'bg-[#802FFF]/20 text-[#802FFF] hover:bg-[#802FFF]/30'
                      : 'hover:bg-muted/50'
                  }`}
                  title='Full agent with workflow editing capabilities.'
                >
                  Agent
                </Button>
              </div>
            </div>
          </div>

          {/* Input area */}
          <ProfessionalInput
            onSubmit={async (message) => {
              await onSendMessage(message)
              setCopilotMessage('')
            }}
            disabled={false}
            isLoading={isLoading}
          />
        </>
      )}
    </div>
  )
}
