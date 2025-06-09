<script setup lang="ts">
import ChatContainer from './components/ChatContainer.vue'
</script>

<template>
  <div class="app">
    <div class="container">
      <div class="header">
        <h1>🤖 OpenAI Agents API</h1>
        <p>Intelligent assistant with streaming responses and tool integration</p>
      </div>
      <ChatContainer />
    </div>
  </div>
</template>

<style scoped>
.app {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
  padding: 20px;
  margin: 0;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.header {
  background: linear-gradient(90deg, #667eea, #764ba2);
  color: white;
  padding: 20px;
  text-align: center;
}

.header h1 {
  font-size: 2rem;
  margin-bottom: 8px;
}

.header p {
  opacity: 0.9;
  font-size: 1.1rem;
}
</style>
