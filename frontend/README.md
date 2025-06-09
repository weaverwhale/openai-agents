# OpenAI Agents - Vue Frontend

A modern web interface for the OpenAI Agents API built with Vue 3, Vite, and TypeScript.

## Features

- **Real-time Chat**: Streaming responses with typing indicators
- **Conversation Management**: Save and replay conversations
- **Tool Integration**: Visual display of tool calls and results
- **Markdown Support**: Rich text rendering for AI responses
- **Modern UI**: Clean, responsive interface with beautiful styling
- **TypeScript**: Fully typed for better development experience

## Development

### Prerequisites

Make sure the API server is running:

```bash
# From the root directory
npm run api:dev
```

### Install Dependencies

```bash
npm install
```

### Development Server

```bash
npm run dev
```

Open http://localhost:5173 to view the application.

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```
src/
├── components/
│   ├── ChatContainer.vue    # Main chat interface
│   ├── Sidebar.vue         # Conversation list and controls
│   ├── MessageList.vue     # Message display with markdown
│   └── MessageInput.vue    # Input form with streaming toggle
├── stores/
│   └── chat.ts            # Pinia store for state management
├── types/
│   └── chat.ts            # TypeScript type definitions
├── assets/
│   └── main.css           # Global styles
├── App.vue                # Root component
└── main.ts               # Application entry point
```

## API Integration

The frontend connects to the API server at `http://localhost:3001` and supports:

- Health checks
- Streaming and non-streaming chat
- Conversation persistence
- Tool call visualization

## Styling

The application uses:

- Scoped CSS in Vue components
- Global markdown styling
- Responsive design
- Modern gradient backgrounds
- Smooth animations and transitions
