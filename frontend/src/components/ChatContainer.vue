<template>
  <div class="chat-container">
    <Sidebar
      :conversations="conversations"
      :current-conversation-id="currentConversationId"
      :server-status="serverStatus"
      @new-conversation="startNewConversation"
      @load-conversation="loadConversation"
    />

    <div class="chat-area">
      <MessageList :messages="messages" :is-typing="isTyping" />

      <MessageInput
        :is-sending="isSending"
        :stream-enabled="streamEnabled"
        @send-message="sendMessage"
        @toggle-stream="streamEnabled = $event"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Sidebar from './Sidebar.vue'
import MessageList from './MessageList.vue'
import MessageInput from './MessageInput.vue'
import { useChatStore } from '../stores/chat'
import type { Conversation, Message, ServerStatus } from '../types/chat'

const chatStore = useChatStore()

const conversations = ref<Conversation[]>([])
const currentConversationId = ref<string | null>(null)
const messages = ref<Message[]>([])
const serverStatus = ref<ServerStatus>({ status: 'connecting', message: 'Connecting...' })
const isTyping = ref(false)
const isSending = ref(false)
const streamEnabled = ref(true)

const API_BASE = 'http://localhost:3001'

onMounted(async () => {
  await checkServerHealth()
  await loadConversations()

  // Initialize with welcome message
  messages.value = [
    {
      id: '1',
      role: 'assistant',
      content:
        "Hi! I'm your AI assistant. I can help you with web search, weather information, calculations, file operations, image generation, and much more. What would you like to do today?",
      timestamp: new Date(),
    },
  ]
})

async function checkServerHealth() {
  try {
    const response = await fetch(`${API_BASE}/health`)
    const data = await response.json()
    serverStatus.value = {
      status: 'connected',
      message: `Connected - Server uptime: ${Math.floor(data.uptime)}s`,
    }
  } catch (error) {
    serverStatus.value = {
      status: 'error',
      message: 'Server offline',
    }
  }
}

async function loadConversations() {
  try {
    const response = await fetch(`${API_BASE}/conversations`)
    conversations.value = await response.json()
  } catch (error) {
    console.error('Failed to load conversations:', error)
  }
}

async function loadConversation(conversationId: string) {
  try {
    serverStatus.value = { status: 'connecting', message: 'Loading conversation...' }

    const response = await fetch(`${API_BASE}/conversations/${conversationId}`)
    if (!response.ok) {
      throw new Error(`Failed to load conversation: ${response.statusText}`)
    }

    const conversation = await response.json()
    currentConversationId.value = conversationId

    // Add replay indicator
    messages.value = [
      {
        id: 'replay',
        role: 'assistant',
        content: `Replaying conversation from ${new Date(conversation.createdAt).toLocaleString()}`,
        timestamp: new Date(),
        isReplay: true,
      },
    ]

    // Add conversation messages
    conversation.messages.forEach((msg: any, index: number) => {
      messages.value.push({
        id: `${conversationId}-${index}`,
        role: msg.role,
        content: msg.content,
        toolCalls: msg.toolCalls,
        timestamp: new Date(),
      })
    })

    await checkServerHealth()
  } catch (error) {
    console.error('Failed to load conversation:', error)
    serverStatus.value = {
      status: 'error',
      message: `Error loading conversation: ${error}`,
    }
    setTimeout(checkServerHealth, 3000)
  }
}

function startNewConversation() {
  currentConversationId.value = null
  messages.value = [
    {
      id: 'welcome',
      role: 'assistant',
      content:
        "Hi! I'm your AI assistant. I can help you with web search, weather information, calculations, file operations, image generation, and much more. What would you like to do today?",
      timestamp: new Date(),
    },
  ]
}

async function sendMessage(message: string) {
  if (!message.trim()) return

  isSending.value = true

  // Add user message
  const userMessage: Message = {
    id: `user-${Date.now()}`,
    role: 'user',
    content: message,
    timestamp: new Date(),
  }
  messages.value.push(userMessage)

  // Show typing indicator
  isTyping.value = true

  try {
    if (streamEnabled.value) {
      await sendStreamingMessage(message)
    } else {
      await sendRegularMessage(message)
    }
  } catch (error) {
    console.error('Error sending message:', error)
    messages.value.push({
      id: `error-${Date.now()}`,
      role: 'assistant',
      content: `Error: ${error}`,
      timestamp: new Date(),
    })
  } finally {
    isTyping.value = false
    isSending.value = false
    await loadConversations()
  }
}

async function sendStreamingMessage(message: string) {
  try {
    const response = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        conversationId: currentConversationId.value,
        stream: true,
      }),
    })

    const reader = response.body?.getReader()
    const decoder = new TextDecoder()

    let assistantMessage = ''
    let assistantMessageId = `assistant-${Date.now()}`
    let toolCalls: any[] = []
    let messageAdded = false

    while (reader) {
      const { value, done } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value)
      const lines = chunk.split('\n')

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6))

            switch (data.type) {
              case 'conversation_id':
                currentConversationId.value = data.conversationId
                break

              case 'text_delta':
                if (!messageAdded) {
                  isTyping.value = false
                  messages.value.push({
                    id: assistantMessageId,
                    role: 'assistant',
                    content: '',
                    timestamp: new Date(),
                  })
                  messageAdded = true
                }

                assistantMessage += data.delta
                const messageIndex = messages.value.findIndex((m) => m.id === assistantMessageId)
                if (messageIndex !== -1) {
                  messages.value[messageIndex].content = assistantMessage
                }
                break

              case 'tool_call':
                isTyping.value = false
                const toolCall = { name: data.toolName, args: data.args }
                toolCalls.push(toolCall)

                const msgIndex = messages.value.findIndex((m) => m.id === assistantMessageId)
                if (msgIndex !== -1) {
                  messages.value[msgIndex].toolCalls = [...toolCalls]
                } else if (!messageAdded) {
                  messages.value.push({
                    id: assistantMessageId,
                    role: 'assistant',
                    content: assistantMessage,
                    toolCalls: [...toolCalls],
                    timestamp: new Date(),
                  })
                  messageAdded = true
                }
                break

              case 'tool_result':
                if (toolCalls.length > 0) {
                  toolCalls[toolCalls.length - 1].result = data.result
                  const msgIndex = messages.value.findIndex((m) => m.id === assistantMessageId)
                  if (msgIndex !== -1) {
                    messages.value[msgIndex].toolCalls = [...toolCalls]
                  }
                }
                break

              case 'complete':
                isTyping.value = false
                break

              case 'error':
                isTyping.value = false
                if (!messageAdded) {
                  messages.value.push({
                    id: assistantMessageId,
                    role: 'assistant',
                    content: `Error: ${data.error}`,
                    timestamp: new Date(),
                  })
                }
                break
            }
          } catch (e) {
            // Ignore JSON parse errors for incomplete chunks
          }
        }
      }
    }
  } catch (error) {
    throw error
  }
}

async function sendRegularMessage(message: string) {
  try {
    const response = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        conversationId: currentConversationId.value,
        stream: false,
      }),
    })

    const data = await response.json()
    isTyping.value = false

    if (data.error) {
      messages.value.push({
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `Error: ${data.error}`,
        timestamp: new Date(),
      })
    } else {
      currentConversationId.value = data.conversationId
      messages.value.push({
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.message,
        toolCalls: data.toolCalls,
        timestamp: new Date(),
      })
    }
  } catch (error) {
    throw error
  }
}
</script>

<style scoped>
.chat-container {
  display: flex;
  height: 600px;
}

.chat-area {
  flex: 1;
  display: flex;
  flex-direction: column;
}
</style>
