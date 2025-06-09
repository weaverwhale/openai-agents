<template>
  <div class="input-area">
    <div class="controls">
      <label class="toggle">
        <input
          type="checkbox"
          :checked="streamEnabled"
          @change="$emit('toggle-stream', ($event.target as HTMLInputElement).checked)"
        />
        <span>Enable Streaming</span>
      </label>
    </div>

    <form class="input-form" @submit="handleSubmit">
      <input
        ref="messageInput"
        v-model="message"
        type="text"
        class="input-field"
        placeholder="Type your message here..."
        autocomplete="off"
        @keypress="handleKeypress"
        :disabled="isSending"
      />
      <button type="submit" class="send-btn" :disabled="isSending || !message.trim()">
        {{ isSending ? 'Sending...' : 'Send' }}
      </button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

defineProps<{
  isSending: boolean
  streamEnabled: boolean
}>()

const emit = defineEmits<{
  'send-message': [message: string]
  'toggle-stream': [enabled: boolean]
}>()

const message = ref('')
const messageInput = ref<HTMLInputElement>()

function handleSubmit(event: Event) {
  event.preventDefault()
  if (message.value.trim()) {
    emit('send-message', message.value)
    message.value = ''
  }
}

function handleKeypress(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    handleSubmit(event)
  }
}
</script>

<style scoped>
.input-area {
  padding: 20px;
  background: white;
  border-top: 1px solid #e9ecef;
}

.controls {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}

.toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.toggle input[type='checkbox'] {
  cursor: pointer;
}

.input-form {
  display: flex;
  gap: 12px;
  align-items: center;
}

.input-field {
  flex: 1;
  padding: 12px 16px;
  border: 2px solid #e9ecef;
  border-radius: 25px;
  font-size: 1rem;
  outline: none;
  transition: border-color 0.2s;
}

.input-field:focus {
  border-color: #667eea;
}

.input-field:disabled {
  background-color: #f8f9fa;
  cursor: not-allowed;
}

.send-btn {
  padding: 12px 24px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 25px;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.2s;
  min-width: 80px;
}

.send-btn:hover:not(:disabled) {
  background: #5a6fd8;
}

.send-btn:disabled {
  background: #adb5bd;
  cursor: not-allowed;
}
</style>
