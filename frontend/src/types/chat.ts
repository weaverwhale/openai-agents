export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  toolCalls?: ToolCall[]
  isReplay?: boolean
}

export interface ToolCall {
  name: string
  args: Record<string, any>
  result?: any
}

export interface Conversation {
  id: string
  lastMessage?: string
  createdAt: string
  messages: Message[]
}

export interface ServerStatus {
  status: 'connecting' | 'connected' | 'error'
  message: string
}
