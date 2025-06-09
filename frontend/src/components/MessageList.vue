<template>
  <div class="messages" ref="messagesContainer">
    <div
      v-for="message in messages"
      :key="message.id"
      :class="['message', message.role, { replay: message.isReplay }]"
    >
      <div class="message-avatar">
        {{ message.role === 'user' ? '👤' : message.isReplay ? '📽️' : '🤖' }}
      </div>
      <div class="message-content">
        <div
          v-if="message.role === 'assistant' && !message.isReplay"
          class="markdown-content"
          v-html="parseMarkdown(message.content)"
        />
        <div v-else>{{ message.content }}</div>

        <div v-if="message.toolCalls?.length" class="tool-calls">
          <div v-for="(toolCall, index) in message.toolCalls" :key="index" class="tool-call">
            <div class="tool-call-header">🔧 {{ toolCall.name }}</div>
            <pre v-if="toolCall.args && Object.keys(toolCall.args).length">{{
              JSON.stringify(toolCall.args, null, 2)
            }}</pre>
            <div v-if="toolCall.result">
              <strong>Result:</strong>
              {{
                typeof toolCall.result === 'object'
                  ? JSON.stringify(toolCall.result, null, 2)
                  : toolCall.result
              }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="isTyping" class="typing-indicator">
      <div class="message-avatar">🤖</div>
      <div class="message-content">AI is thinking...</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, watch } from 'vue'
import { marked } from 'marked'
import type { Message } from '../types/chat'

const props = defineProps<{
  messages: Message[]
  isTyping: boolean
}>()

const messagesContainer = ref<HTMLDivElement>()

function parseMarkdown(content: string): string {
  try {
    const result = marked.parse(content)
    return typeof result === 'string' ? result : result.toString()
  } catch (error) {
    console.warn('Markdown parsing failed, using plain text:', error)
    return content
  }
}

// Auto-scroll to bottom when new messages arrive
watch(
  () => props.messages.length,
  async () => {
    await nextTick()
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  },
)

// Auto-scroll when typing indicator changes
watch(
  () => props.isTyping,
  async () => {
    await nextTick()
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  },
)
</script>

<style scoped>
.messages {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  background: #fafbfc;
}

.message {
  margin-bottom: 16px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.message.user {
  flex-direction: row-reverse;
}

.message-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  color: white;
  flex-shrink: 0;
}

.message.user .message-avatar {
  background: #667eea;
}

.message.assistant .message-avatar {
  background: #28a745;
}

.message-content {
  max-width: 70%;
  padding: 12px 16px;
  border-radius: 18px;
  word-wrap: break-word;
  background: white;
  border: 1px solid #e9ecef;
}

.message.user .message-content {
  background: #667eea;
  color: white;
  border: 1px solid #5a6fd8;
}

.message.assistant .message-content {
  background: white;
  border: 1px solid #e9ecef;
  color: #333;
}

.message.replay .message-content {
  font-style: italic;
  opacity: 0.8;
}

.tool-calls {
  margin-top: 8px;
}

.tool-call {
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 8px;
  padding: 12px;
  margin: 8px 0;
  font-size: 0.9rem;
}

.tool-call-header {
  font-weight: bold;
  color: #856404;
  margin-bottom: 4px;
}

.tool-call pre {
  background: #f8f9fa;
  padding: 8px;
  border-radius: 4px;
  overflow-x: auto;
  font-size: 0.85rem;
  margin: 4px 0;
}

.typing-indicator {
  margin-bottom: 16px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.typing-indicator .message-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  color: white;
  flex-shrink: 0;
  background: #28a745;
}

.typing-indicator .message-content {
  max-width: 70%;
  padding: 12px 16px;
  border-radius: 18px;
  background: white;
  border: 1px solid #e9ecef;
  color: #6c757d;
  font-style: italic;
  position: relative;
  overflow: hidden;
}

.typing-indicator .message-content::after {
  content: '';
  display: inline-block;
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: #6c757d;
  margin-left: 4px;
  animation: blink 1.4s infinite both;
}

@keyframes blink {
  0%,
  80%,
  100% {
    opacity: 0;
  }
  40% {
    opacity: 1;
  }
}

/* Ensure user message content doesn't get markdown styling */
.message.user .message-content :deep(h1),
.message.user .message-content :deep(h2),
.message.user .message-content :deep(h3),
.message.user .message-content :deep(h4),
.message.user .message-content :deep(h5),
.message.user .message-content :deep(h6) {
  font-size: inherit;
  font-weight: inherit;
  margin: 0;
}

.message.user .message-content :deep(p) {
  margin: 0;
}
</style>
