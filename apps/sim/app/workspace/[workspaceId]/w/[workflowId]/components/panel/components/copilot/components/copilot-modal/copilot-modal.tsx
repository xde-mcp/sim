'use client'

import { useEffect, useRef } from 'react'
import { Bot, ChevronDown, MessageSquarePlus, MoreHorizontal, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { CopilotChat } from '@/lib/copilot/api'
import { createLogger } from '@/lib/logs/console-logger'
import type { CopilotMessage } from '@/stores/copilot/types'
import { ProfessionalInput } from '../professional-input/professional-input'
import { ProfessionalMessage } from '../professional-message/professional-message'

const logger = createLogger('CopilotModal')

interface Message {
  id: string
  content: string
  type: 'user' | 'assistant'
  timestamp: Date
  citations?: Array<{
    id: number
    title: string
    url: string
  }>
}

interface CopilotModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  copilotMessage: string
  setCopilotMessage: (message: string) => void
  messages: Message[]
  onSendMessage: (message: string) => Promise<void>
  isLoading: boolean
  // Chat management props
  chats: CopilotChat[]
  currentChat: CopilotChat | null
  onSelectChat: (chat: CopilotChat) => void
  onStartNewChat: () => void
  onDeleteChat: (chatId: string) => void
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
}: CopilotModalProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  if (!open) return null

  return (
    <div className='fixed inset-0 z-[100] flex flex-col bg-background'>
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant='ghost' className='h-8 max-w-[300px] flex-1 justify-start px-3'>
                <span className='truncate'>{currentChat?.title || 'New Chat'}</span>
                <ChevronDown className='ml-2 h-4 w-4 shrink-0' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='start' className='z-[110] w-64' sideOffset={8}>
              {chats.length === 0 ? (
                <div className='px-3 py-2 text-muted-foreground text-sm'>No chats yet</div>
              ) : (
                // Sort chats by creation date (most recent first) for display
                [...chats]
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map((chat) => (
                    <div key={chat.id} className='flex items-center gap-1 px-1'>
                      <div
                        onClick={() => onSelectChat(chat)}
                        className={`min-w-0 flex-1 cursor-pointer rounded px-2 py-2 transition-colors hover:bg-accent ${
                          currentChat?.id === chat.id ? 'bg-accent' : ''
                        }`}
                      >
                        <div className='min-w-0'>
                          <div className='truncate font-medium text-sm'>
                            {chat.title || 'Untitled Chat'}
                          </div>
                          <div className='truncate text-muted-foreground text-xs'>
                            {chat.messageCount} messages •{' '}
                            {new Date(chat.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant='ghost' size='sm' className='h-8 w-8 shrink-0 p-0'>
                            <MoreHorizontal className='h-4 w-4' />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align='end' className='z-[120]'>
                          <DropdownMenuItem
                            onClick={() => onDeleteChat(chat.id)}
                            className='cursor-pointer text-destructive'
                          >
                            <Trash2 className='mr-2 h-4 w-4' />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

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

      {/* Messages container */}
      <div ref={messagesContainerRef} className='flex-1 overflow-y-auto'>
        <div className='mx-auto max-w-3xl'>
          {messages.length === 0 ? (
            <div className='flex h-full flex-col items-center justify-center px-4 py-10'>
              <div className='space-y-4 text-center'>
                <Bot className='mx-auto h-12 w-12 text-muted-foreground' />
                <div className='space-y-2'>
                  <h3 className='font-medium text-lg'>Welcome to Documentation Copilot</h3>
                  <p className='text-muted-foreground text-sm'>
                    Ask me anything about Sim Studio features, workflows, tools, or how to get
                    started.
                  </p>
                </div>
                <div className='mx-auto max-w-xs space-y-2 text-left'>
                  <div className='text-muted-foreground text-xs'>Try asking:</div>
                  <div className='space-y-1'>
                    <div className='rounded bg-muted/50 px-2 py-1 text-xs'>
                      "How do I create a workflow?"
                    </div>
                    <div className='rounded bg-muted/50 px-2 py-1 text-xs'>
                      "What tools are available?"
                    </div>
                    <div className='rounded bg-muted/50 px-2 py-1 text-xs'>
                      "How do I deploy my workflow?"
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            messages.map((message) => {
              // Convert modal message format to CopilotMessage format
              const copilotMessage: CopilotMessage = {
                id: message.id,
                role: message.type === 'user' ? 'user' : 'assistant',
                content: message.content,
                timestamp: message.timestamp.toISOString(),
                citations: message.citations,
              }
              return (
                <ProfessionalMessage
                  key={message.id}
                  message={copilotMessage}
                  isStreaming={false}
                />
              )
            })
          )}

          {/* Loading indicator (shows only when loading) */}
          {isLoading && (
            <div className='px-4 py-5'>
              <div className='mx-auto max-w-3xl'>
                <div className='flex'>
                  <div className='max-w-[80%]'>
                    <div className='flex h-6 items-center'>
                      <div className='loading-dot h-3 w-3 rounded-full bg-black dark:bg-black' />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} className='h-1' />
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
        placeholder='Ask about Sim Studio documentation...'
      />
    </div>
  )
}
