<template>
  <div class="sidebar">
    <h3>Conversations</h3>

    <div class="controls">
      <button class="new-chat-btn" @click="$emit('new-conversation')">New Chat</button>
    </div>

    <div :class="['status', serverStatus.status]">
      {{ serverStatus.message }}
    </div>

    <div class="conversation-list">
      <div
        v-for="conversation in conversations"
        :key="conversation.id"
        :class="['conversation-item', { active: conversation.id === currentConversationId }]"
        @click="$emit('load-conversation', conversation.id)"
      >
        <div>
          <strong>Chat {{ conversation.id.split('_')[1] }}</strong>
        </div>
        <div class="conversation-preview">
          {{ conversation.lastMessage || 'New conversation' }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Conversation, ServerStatus } from '../types/chat'

defineProps<{
  conversations: Conversation[]
  currentConversationId: string | null
  serverStatus: ServerStatus
}>()

defineEmits<{
  'new-conversation': []
  'load-conversation': [id: string]
}>()
</script>

<style scoped>
.sidebar {
  width: 300px;
  background: #f8f9fa;
  border-right: 1px solid #e9ecef;
  padding: 20px;
  overflow-y: auto;
}

.sidebar h3 {
  margin-bottom: 15px;
  color: #495057;
}

.controls {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}

.new-chat-btn {
  padding: 8px 16px;
  background: #28a745;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background 0.2s;
}

.new-chat-btn:hover {
  background: #218838;
}

.status {
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 0.9rem;
  margin-bottom: 12px;
}

.status.connecting {
  background: #fff3cd;
  color: #856404;
}

.status.connected {
  background: #d4edda;
  color: #155724;
}

.status.error {
  background: #f8d7da;
  color: #721c24;
}

.conversation-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.conversation-item {
  padding: 12px;
  background: white;
  border-radius: 8px;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.2s;
  position: relative;
}

.conversation-item:hover {
  border-color: #667eea;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.conversation-item.active {
  border-color: #667eea;
  background: #f0f4ff;
  box-shadow: 0 2px 4px rgba(102, 126, 234, 0.2);
}

.conversation-item::before {
  content: 'Click to replay';
  position: absolute;
  top: -25px;
  left: 50%;
  transform: translateX(-50%);
  background: #333;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s;
  white-space: nowrap;
  z-index: 1000;
}

.conversation-item:hover::before {
  opacity: 1;
}

.conversation-preview {
  font-size: 0.9rem;
  color: #6c757d;
  margin-top: 4px;
}
</style>
