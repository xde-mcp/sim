'use client'

import { useState } from 'react'
import { PanelRight, X, CircleSlash } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useChatStore } from '@/stores/panel/chat/store'
import { useConsoleStore } from '@/stores/panel/console/store'
import { usePanelStore } from '@/stores/panel/store'
import { useWorkflowRegistry } from '@/stores/workflows/registry/store'
import { Chat } from './components/chat/chat'
import { ChatModal } from './components/chat/components/chat-modal/chat-modal'
import { Console } from './components/console/console'
import { Variables } from './components/variables/variables'

export function Panel() {
  const [chatMessage, setChatMessage] = useState<string>('')
  const [isChatModalOpen, setIsChatModalOpen] = useState(false)

  const isOpen = usePanelStore((state) => state.isOpen)
  const togglePanel = usePanelStore((state) => state.togglePanel)
  const activeTab = usePanelStore((state) => state.activeTab)
  const setActiveTab = usePanelStore((state) => state.setActiveTab)

  const clearConsole = useConsoleStore((state) => state.clearConsole)
  const clearChat = useChatStore((state) => state.clearChat)
  const { activeWorkflowId } = useWorkflowRegistry()

  // Fixed width to match floating tab selector
  const panelWidth = 308

  if (!isOpen) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={togglePanel}
            className='fixed right-4 bottom-[18px] z-10 flex h-9 w-9 items-center justify-center rounded-lg border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground'
          >
            <PanelRight className='h-5 w-5' />
            <span className='sr-only'>Open Panel</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side='top'>Open Panel</TooltipContent>
      </Tooltip>
    )
  }
  return (
    <>
      {/* Tab Selector */}
      <div className='fixed top-[76px] right-4 z-20 flex h-9 w-[308px] items-center gap-1 rounded-[14px] border bg-card px-[2.5px] py-1 shadow-xs'>
        <button
          onClick={() => setActiveTab('chat')}
          className={`panel-tab-base inline-flex flex-1 cursor-pointer items-center justify-center rounded-[10px] border border-transparent py-1 font-[450] text-sm outline-none transition-colors duration-200 ${
            activeTab === 'chat' ? 'panel-tab-active' : 'panel-tab-inactive'
          }`}
        >
          Chat
        </button>
        <button
          onClick={() => setActiveTab('console')}
          className={`panel-tab-base inline-flex flex-1 cursor-pointer items-center justify-center rounded-[10px] border border-transparent py-1 font-[450] text-sm outline-none transition-colors duration-200 ${
            activeTab === 'console' ? 'panel-tab-active' : 'panel-tab-inactive'
          }`}
        >
          Console
        </button>
        <button
          onClick={() => setActiveTab('variables')}
          className={`panel-tab-base inline-flex flex-1 cursor-pointer items-center justify-center rounded-[10px] border border-transparent py-1 font-[450] text-sm outline-none transition-colors duration-200 ${
            activeTab === 'variables' ? 'panel-tab-active' : 'panel-tab-inactive'
          }`}
        >
          Variables
        </button>
      </div>

      {/* Panel Content */}
      <div className='fixed top-[124px] right-4 bottom-4 z-10 flex w-[308px] flex-col rounded-[14px] border bg-card px-3 shadow-xs'>
        {/* Header */}
        <div className='flex items-center justify-between pt-3 pb-1'>
          <h2 className='font-[450] text-base capitalize text-card-foreground'>{activeTab}</h2>
          <div className='flex items-center gap-2'>
            {(activeTab === 'console' || activeTab === 'chat') && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() =>
                      activeTab === 'console'
                        ? clearConsole(activeWorkflowId)
                        : clearChat(activeWorkflowId)
                    }
                    className='font-medium text-md leading-normal transition-all hover:brightness-75 dark:hover:brightness-125'
                    style={{ color: 'var(--base-muted-foreground)' }}
                  >
                    <CircleSlash className='h-4 w-4' strokeWidth={2} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side='bottom'>Clear {activeTab}</TooltipContent>
              </Tooltip>
            )}
            <button
              onClick={togglePanel}
              className='font-medium text-md leading-normal transition-all hover:brightness-75 dark:hover:brightness-125'
              style={{ color: 'var(--base-muted-foreground)' }}
            >
              <X className='h-4 w-4' strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Panel Content Area */}
        <div className='flex-1 overflow-hidden'>
          {activeTab === 'chat' ? (
            <Chat
              panelWidth={panelWidth}
              chatMessage={chatMessage}
              setChatMessage={setChatMessage}
            />
          ) : activeTab === 'console' ? (
            <Console panelWidth={panelWidth} />
          ) : (
            <Variables panelWidth={panelWidth} />
          )}
        </div>
      </div>

      {/* Fullscreen Chat Modal */}
      <ChatModal
        open={isChatModalOpen}
        onOpenChange={setIsChatModalOpen}
        chatMessage={chatMessage}
        setChatMessage={setChatMessage}
      />
    </>
  )
}