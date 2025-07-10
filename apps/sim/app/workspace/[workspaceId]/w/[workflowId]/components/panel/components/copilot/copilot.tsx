'use client'

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react'
import { Bot, ChevronDown, MessageSquarePlus, MoreHorizontal, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import { createLogger } from '@/lib/logs/console-logger'
import { useCopilotStore } from '@/stores/copilot/store'
import { useWorkflowRegistry } from '@/stores/workflows/registry/store'
import { CopilotModal } from './components/copilot-modal/copilot-modal'
import { ProfessionalInput } from './components/professional-input/professional-input'
import { ProfessionalMessage } from './components/professional-message/professional-message'

const logger = createLogger('Copilot')

interface CopilotProps {
  panelWidth: number
  isFullscreen?: boolean
  onFullscreenToggle?: (fullscreen: boolean) => void
  fullscreenInput?: string
  onFullscreenInputChange?: (input: string) => void
}

interface CopilotRef {
  clearMessages: () => void
  startNewChat: () => void
}

export const Copilot = forwardRef<CopilotRef, CopilotProps>(
  (
    {
      panelWidth,
      isFullscreen = false,
      onFullscreenToggle,
      fullscreenInput = '',
      onFullscreenInputChange,
    },
    ref
  ) => {
    const scrollAreaRef = useRef<HTMLDivElement>(null)

    const { activeWorkflowId } = useWorkflowRegistry()

    // Use the new copilot store
    const {
      currentChat,
      chats,
      messages,
      isLoading,
      isLoadingChats,
      isSendingMessage,
      error,
      workflowId,
      setWorkflowId,
      selectChat,
      createNewChat,
      deleteChat,
      sendMessage,
      clearMessages,
      clearError,
    } = useCopilotStore()

    // Sync workflow ID with store
    useEffect(() => {
      if (activeWorkflowId !== workflowId) {
        setWorkflowId(activeWorkflowId)
      }
    }, [activeWorkflowId, workflowId, setWorkflowId])

    // Auto-scroll to bottom when new messages are added
    useEffect(() => {
      if (scrollAreaRef.current) {
        const scrollContainer = scrollAreaRef.current.querySelector(
          '[data-radix-scroll-area-viewport]'
        )
        if (scrollContainer) {
          scrollContainer.scrollTop = scrollContainer.scrollHeight
        }
      }
    }, [messages])

    // Handle chat deletion
    const handleDeleteChat = useCallback(
      async (chatId: string) => {
        try {
          await deleteChat(chatId)
          logger.info('Chat deleted successfully')
        } catch (error) {
          logger.error('Error deleting chat:', error)
        }
      },
      [deleteChat]
    )

    // Handle new chat creation
    const handleStartNewChat = useCallback(() => {
      clearMessages()
      logger.info('Started new chat')
    }, [clearMessages])

    // Expose functions to parent
    useImperativeHandle(
      ref,
      () => ({
        clearMessages: handleStartNewChat,
        startNewChat: handleStartNewChat,
      }),
      [handleStartNewChat]
    )

    // Handle message submission
    const handleSubmit = useCallback(
      async (query: string) => {
        if (!query || isSendingMessage || !activeWorkflowId) return

        try {
          await sendMessage(query, { stream: true })
          logger.info('Sent message:', query)
        } catch (error) {
          logger.error('Failed to send message:', error)
        }
      },
      [isSendingMessage, activeWorkflowId, sendMessage]
    )

    // Convert messages for modal (role -> type)
    const modalMessages = messages.map((msg) => ({
      id: msg.id,
      content: msg.content,
      type: msg.role as 'user' | 'assistant',
      timestamp: new Date(msg.timestamp),
      citations: msg.citations,
    }))

    // Handle modal message sending
    const handleModalSendMessage = useCallback(
      async (message: string) => {
        await handleSubmit(message)
      },
      [handleSubmit]
    )

    return (
      <>
        <div className='flex h-full flex-col'>
          {/* Header with Chat Title and Management */}
          <div className='border-b p-4'>
            <div className='flex items-center justify-between'>
              {/* Chat Title Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant='ghost' className='h-8 min-w-0 flex-1 justify-start px-3'>
                    <span className='truncate'>{currentChat?.title || 'New Chat'}</span>
                    <ChevronDown className='ml-2 h-4 w-4 shrink-0' />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align='start' className='z-[110] w-64' sideOffset={8}>
                  {chats.map((chat) => (
                    <div key={chat.id} className='flex items-center'>
                      <DropdownMenuItem
                        onClick={() => selectChat(chat)}
                        className='flex-1 cursor-pointer'
                      >
                        <div className='min-w-0 flex-1'>
                          <div className='truncate font-medium text-sm'>
                            {chat.title || 'Untitled Chat'}
                          </div>
                          <div className='text-muted-foreground text-xs'>
                            {chat.messageCount} messages •{' '}
                            {new Date(chat.updatedAt).toLocaleDateString()}
                          </div>
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant='ghost' size='sm' className='h-8 w-8 shrink-0 p-0'>
                            <MoreHorizontal className='h-4 w-4' />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align='end' className='z-[120]'>
                          <DropdownMenuItem
                            onClick={() => handleDeleteChat(chat.id)}
                            className='cursor-pointer text-destructive'
                          >
                            <Trash2 className='mr-2 h-4 w-4' />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* New Chat Button */}
              <Button
                variant='ghost'
                size='sm'
                onClick={handleStartNewChat}
                className='h-8 w-8 p-0'
                title='New Chat'
              >
                <MessageSquarePlus className='h-4 w-4' />
              </Button>
            </div>

            {/* Error display */}
            {error && (
              <div className='mt-2 rounded-md bg-destructive/10 p-2 text-destructive text-sm'>
                {error}
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={clearError}
                  className='ml-2 h-auto p-1 text-destructive'
                >
                  Dismiss
                </Button>
              </div>
            )}
          </div>

          {/* Messages area */}
          <ScrollArea ref={scrollAreaRef} className='flex-1'>
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
              messages.map((message) => (
                <ProfessionalMessage
                  key={message.id}
                  message={message}
                  isStreaming={isSendingMessage && message.id === messages[messages.length - 1]?.id}
                />
              ))
            )}
          </ScrollArea>

          {/* Input area */}
          <ProfessionalInput
            onSubmit={handleSubmit}
            disabled={!activeWorkflowId}
            isLoading={isSendingMessage}
            placeholder='Ask about Sim Studio documentation...'
          />
        </div>

        {/* Fullscreen Modal */}
        <CopilotModal
          open={isFullscreen}
          onOpenChange={(open) => onFullscreenToggle?.(open)}
          copilotMessage={fullscreenInput}
          setCopilotMessage={(message) => onFullscreenInputChange?.(message)}
          messages={modalMessages}
          onSendMessage={handleModalSendMessage}
          isLoading={isSendingMessage}
          chats={chats}
          currentChat={currentChat}
          onSelectChat={selectChat}
          onStartNewChat={handleStartNewChat}
          onDeleteChat={handleDeleteChat}
        />
      </>
    )
  }
)

Copilot.displayName = 'Copilot'
