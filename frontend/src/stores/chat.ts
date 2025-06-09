import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Conversation, Message, ServerStatus } from '../types/chat'

export const useChatStore = defineStore('chat', () => {
  const conversations = ref<Conversation[]>([])
  const currentConversationId = ref<string | null>(null)
  const messages = ref<Message[]>([])
  const serverStatus = ref<ServerStatus>({ status: 'connecting', message: 'Connecting...' })
  const isTyping = ref(false)
  const isSending = ref(false)
  const streamEnabled = ref(true)

  function setConversations(newConversations: Conversation[]) {
    conversations.value = newConversations
  }

  function setCurrentConversationId(id: string | null) {
    currentConversationId.value = id
  }

  function setMessages(newMessages: Message[]) {
    messages.value = newMessages
  }

  function addMessage(message: Message) {
    messages.value.push(message)
  }

  function updateMessage(id: string, updates: Partial<Message>) {
    const index = messages.value.findIndex((m) => m.id === id)
    if (index !== -1) {
      messages.value[index] = { ...messages.value[index], ...updates }
    }
  }

  function setServerStatus(status: ServerStatus) {
    serverStatus.value = status
  }

  function setIsTyping(typing: boolean) {
    isTyping.value = typing
  }

  function setIsSending(sending: boolean) {
    isSending.value = sending
  }

  function setStreamEnabled(enabled: boolean) {
    streamEnabled.value = enabled
  }

  return {
    conversations,
    currentConversationId,
    messages,
    serverStatus,
    isTyping,
    isSending,
    streamEnabled,
    setConversations,
    setCurrentConversationId,
    setMessages,
    addMessage,
    updateMessage,
    setServerStatus,
    setIsTyping,
    setIsSending,
    setStreamEnabled,
  }
})
