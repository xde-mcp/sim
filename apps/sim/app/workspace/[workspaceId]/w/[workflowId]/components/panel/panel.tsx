'use client'

import { useState } from 'react'
import { PanelRight } from 'lucide-react'
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

  //  {(activeTab === 'console' || activeTab === 'chat') && (
  //           <button
  //             onClick={() =>
  //               activeTab === 'console'
  //                 ? clearConsole(activeWorkflowId)
  //                 : clearChat(activeWorkflowId)
  //             }
  //             className='rounded-md px-3 py-1 text-muted-foreground text-sm transition-colors hover:bg-accent/50 hover:text-foreground'
  //           >
  //             Clear
  //           </button>
  //         )}

  return (
    <>
      {/* Tab Selector */}
      <div className='fixed top-[76px] right-4 z-20 flex h-9 w-[308px] items-center gap-1 rounded-[14px] border border-[hsl(var(--card-border))] bg-[hsl(var(--card-background))] px-[2.5px] py-1 shadow-xs'>
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
      <div className='fixed top-[124px] right-4 bottom-4 z-10 flex w-[308px] flex-col rounded-[14px] border border-[hsl(var(--card-border))] bg-[hsl(var(--card-background))] shadow-xs'>
        {/* Panel Content Area */}
        <div className='flex-1 overflow-hidden rounded-[14px]'>
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
