/**
 * Copilot message structure
 */
export interface CopilotMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
  citations?: Array<{
    id: number
    title: string
    url: string
  }>
}

/**
 * Copilot checkpoint structure
 */
export interface CopilotCheckpoint {
  id: string
  userId: string
  workflowId: string
  chatId: string
  yaml: string
  createdAt: Date
  updatedAt: Date
}

/**
 * Chat mode types
 */
export type CopilotMode = 'ask' | 'agent'

/**
 * Chat interface for copilot conversations
 */
export interface CopilotChat {
  id: string
  title: string | null
  model: string
  messages: CopilotMessage[]
  messageCount: number
  createdAt: Date
  updatedAt: Date
}

/**
 * Copilot store state
 */
export interface CopilotState {
  // Current mode
  mode: CopilotMode

  // Chat management
  currentChat: CopilotChat | null
  chats: CopilotChat[]
  messages: CopilotMessage[]
  workflowId: string | null

  // Checkpoint management
  checkpoints: CopilotCheckpoint[]

  // Loading states
  isLoading: boolean
  isLoadingChats: boolean
  isLoadingCheckpoints: boolean
  isSendingMessage: boolean
  isSaving: boolean
  isRevertingCheckpoint: boolean

  // Error states
  error: string | null
  saveError: string | null
  checkpointError: string | null
}

/**
 * Copilot store actions
 */
export interface CopilotActions {
  // Mode management
  setMode: (mode: CopilotMode) => void

  // Chat management
  setWorkflowId: (workflowId: string | null) => void
  validateCurrentChat: () => boolean
  loadChats: () => Promise<void>
  selectChat: (chat: CopilotChat) => Promise<void>
  createNewChat: (options?: { title?: string; initialMessage?: string }) => Promise<void>
  deleteChat: (chatId: string) => Promise<void>

  // Message handling
  sendMessage: (message: string, options?: { stream?: boolean }) => Promise<void>
  sendDocsMessage: (query: string, options?: { stream?: boolean; topK?: number }) => Promise<void>
  saveChatMessages: (chatId: string) => Promise<void>

  // Checkpoint management
  loadCheckpoints: (chatId: string) => Promise<void>
  revertToCheckpoint: (checkpointId: string) => Promise<void>

  // Utility actions
  clearMessages: () => void
  clearError: () => void
  clearSaveError: () => void
  clearCheckpointError: () => void
  retrySave: (chatId: string) => Promise<void>
  reset: () => void

  // Internal helper (not exposed publicly)
  handleStreamingResponse: (stream: ReadableStream, messageId: string) => Promise<void>
}

/**
 * Combined copilot store interface
 */
export type CopilotStore = CopilotState & CopilotActions
