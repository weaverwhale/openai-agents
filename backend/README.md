# 🤖 OpenAI Agents - Backend

The backend for the OpenAI Agents project provides both a CLI interface and a REST API server for interacting with an intelligent AI assistant powered by OpenAI's Agents framework.

## Overview

This backend consists of two main components:

1. **CLI Agent** (`mega-agent.ts`) - Interactive command-line interface
2. **API Server** (`api-server.ts`) - REST API with streaming support for web frontend integration

## Features

- **Streaming Responses**: Real-time AI response streaming for better UX
- **Human-in-the-Loop Approvals**: Security controls for sensitive operations
- **12 Built-in Tools**: Comprehensive toolset for various tasks
- **Conversation Management**: Persistent conversation history
- **File Upload Support**: Handle file uploads via API
- **Beautiful CLI**: Rich terminal interface with colors and animations
- **WebSocket-like Streaming**: Server-sent events for real-time communication

## Quick Start

### Prerequisites

- Node.js 22+ 
- OpenAI API key
- Optional: Visual Crossing API key (for weather)
- Optional: GitHub token (for weekly reports)

### Environment Setup

Create a `.env` file in the backend directory:

```bash
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini  # Optional, defaults to gpt-4o-mini
VISUAL_CROSSING_API_KEY=your_visual_crossing_api_key_here
GITHUB_TOKEN=your_github_token_here  # Optional, for GitHub weekly reports
```

### Installation

```bash
# Install dependencies
npm install
```

### Running the Backend

#### CLI Mode
```bash
# Start the interactive CLI
npm start
# or
npm run dev
```

#### API Server Mode
```bash
# Start the API server (default port 3001)
npm run api
# or for development with auto-reload
npm run api:dev
```

#### Build for Production
```bash
# Create standalone executable
npm run build
# Creates ./bin/openai-agents executable
```

## CLI Interface

The CLI provides an interactive conversational interface with the AI agent.

### CLI Features

- **Rich Terminal UI**: Colorful interface with loading animations
- **Tool Usage Indicators**: Visual feedback when tools are being used
- **Conversation History**: Access to previous messages
- **Help System**: Built-in help and command reference
- **Approval Prompts**: Interactive approval for sensitive operations

### CLI Commands

- `exit` or `quit` - Exit the application  
- `clear` - Clear screen and reset conversation
- `history` - Show conversation history
- `help` - Display help information

### CLI Usage Example

```bash
$ npm start

🤖 MEGA AGENT - Your AI Assistant
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Welcome to your intelligent CLI assistant!

You: What's the weather like at coordinates 40.7128, -74.0060?

🌤️ Get Weather
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
latitude: 40.7128
longitude: -74.0060
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🤖 The current weather in New York City is partly cloudy with...
```

## API Server

The API server provides HTTP endpoints for web frontend integration.

### API Endpoints

#### Health Check
```http
GET /health
```
Returns server status and uptime information.

#### Chat Endpoint  
```http
POST /chat
Content-Type: application/json

{
  "message": "Your message here",
  "conversationId": "optional_conversation_id", 
  "stream": true
}
```

**Streaming Response**: When `stream: true`, returns Server-Sent Events:
```
data: {"type": "text", "content": "AI response chunk"}
data: {"type": "tool_call", "name": "search", "args": {...}}
data: {"type": "tool_result", "result": "Tool output"}
```

**Non-streaming Response**:
```json
{
  "conversationId": "conv_123456789",
  "response": "AI response text",
  "toolCalls": [...]
}
```

#### Conversation Management
```http
GET /conversations          # List all conversations
GET /conversations/:id      # Get specific conversation
DELETE /conversations/:id   # Delete conversation
```

#### File Upload
```http
POST /upload
Content-Type: multipart/form-data
```
Supports files up to 50MB. Uploaded files are stored in `uploads/` directory.

### API Usage Example

```javascript
// Streaming chat request
const response = await fetch('/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: 'Generate an image of a sunset',
    stream: true
  })
});

const reader = response.body.getReader();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const chunk = new TextDecoder().decode(value);
  const lines = chunk.split('\n');
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = JSON.parse(line.slice(6));
      console.log('Received:', data);
    }
  }
}
```

## Available Tools

The backend includes 12 powerful built-in tools:

### Core Tools
1. **🌤️ Weather Tool** - Real-time weather data via Visual Crossing API
2. **🔍 Search Tool** - AI-powered web search with current information  
3. **🧮 Calculator Tool** - Mathematical calculations and expressions
4. **📁 File Operations** - Read, write, list files and directories
5. **⏰ Time Tool** - Current time, dates, and timezone information
6. **💻 System Info** - OS, memory, CPU, and system details

### Advanced Tools  
7. **🎨 Image Generation** - DALL-E 3 powered image creation
8. **🐋 Moby Tool** - Triple Whale e-commerce analytics integration
9. **🗣️ Urban Dictionary** - Slang definitions and meanings
10. **📚 Wikipedia** - Article summaries and information lookup
11. **📈 Forecast Tool** - Time series forecasting with statistical analysis  
12. **📊 Weekly Report** - GitHub activity and contribution reports

### Tool Security

Many tools implement human-in-the-loop approval for security:

- **File Operations**: Write operations require approval
- **Image Generation**: All requests require approval  
- **Urban Dictionary**: All requests require approval
- **Moby Tool**: Sensitive business queries require approval
- **Weekly Report**: GitHub API access requires approval

When approval is needed, users see detailed prompts:
```
⚠️  APPROVAL REQUIRED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Tool: file_operations
Arguments: {"operation":"write","filepath":"data.txt"}
Do you approve this tool usage? (y/n):
```

## Architecture

### Project Structure
```
backend/
├── src/
│   ├── mega-agent.ts          # CLI interface main entry point
│   ├── api-server.ts          # REST API server
│   ├── prompt.ts              # System prompt configuration
│   ├── openai.ts              # OpenAI client setup
│   └── tools/                 # Tool implementations
│       ├── index.ts           # Tool exports and registry
│       ├── types.ts           # Shared type definitions
│       ├── weather.ts         # Weather API integration
│       ├── search.ts          # Web search functionality
│       ├── calculator.ts      # Math calculations
│       ├── fileOperations.ts  # File system operations
│       ├── time.ts            # Time/date utilities
│       ├── systemInfo.ts      # System information
│       ├── imageGeneration.ts # DALL-E integration
│       ├── moby.ts            # Triple Whale Moby API
│       ├── urbanDictionary.ts # Urban Dictionary API
│       ├── wikipedia.ts       # Wikipedia API
│       ├── forecast.ts        # Time series forecasting
│       └── weeklyReport.ts    # GitHub reporting
├── uploads/                   # File upload storage
├── package.json              # Dependencies and scripts
└── README.md                 # This file
```

### Key Dependencies

- **@openai/agents**: OpenAI Agents framework
- **express**: Web server framework  
- **cors**: Cross-origin resource sharing
- **multer**: File upload handling
- **chalk**: Terminal colors and styling
- **dotenv**: Environment variable management
- **zod**: Schema validation
- **tsx**: TypeScript execution

## Adding Custom Tools

To create a new tool:

1. **Create tool file** in `src/tools/`:

```typescript
// src/tools/myTool.ts
import { tool } from '@openai/agents';
import { z } from 'zod';

export const myTool = tool({
  name: 'my_tool',
  description: 'Describe what your tool does',
  parameters: z.object({
    input: z.string().describe('Tool input parameter'),
  }),
  needsApproval: async (ctx, { input }) => {
    // Return true if approval needed
    return input.includes('sensitive');
  },
  execute: async ({ input }) => {
    // Tool implementation
    return `Processed: ${input}`;
  },
});
```

2. **Export from index**:

```typescript
// src/tools/index.ts
export { myTool } from './myTool';

export const allTools = [
  // ... existing tools
  myTool,
];
```

3. **Add CLI emoji** (optional):

```typescript
// src/mega-agent.ts - in showToolUsage function
const toolEmojis: { [key: string]: string } = {
  // ... existing emojis
  my_tool: '🔧',
};
```

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | OpenAI API key for agent functionality |
| `OPENAI_MODEL` | No | Model to use (default: gpt-4o-mini) |
| `VISUAL_CROSSING_API_KEY` | No | Weather data API key |
| `GITHUB_TOKEN` | No | GitHub API access for weekly reports |  
| `PORT` | No | API server port (default: 3001) |

### Tool Configuration

Individual tools may have additional configuration options. Check each tool's source file for specific environment variables or configuration requirements.

## Development

### Local Development
```bash
# Start API server with auto-reload
npm run api:dev

# Start CLI in development mode  
npm run dev
```

### Debugging

Enable verbose logging by setting environment variables:
```bash
DEBUG=1 npm start           # CLI with debug output
DEBUG=1 npm run api:dev     # API server with debug output
```

### Testing Tools

Test individual tools by importing and calling them directly:

```typescript
import { searchTool } from './src/tools/search';

const result = await searchTool.execute({ query: 'test query' });
console.log(result);
```

## Production Deployment

### Building
```bash
npm run build
# Creates ./bin/openai-agents executable
```

### Docker (Example)
```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3001
CMD ["npm", "run", "api"]
```

### Environment Setup
- Ensure all required environment variables are set
- Configure file upload directory permissions
- Set up reverse proxy for API server if needed
- Consider rate limiting for production use

## Troubleshooting

### Common Issues

1. **OpenAI API Key Error**: Ensure `OPENAI_API_KEY` is set correctly
2. **Tool Approval Hanging**: Check terminal input for approval prompts
3. **File Upload Fails**: Verify `uploads/` directory exists and is writable
4. **Weather Tool Error**: Check `VISUAL_CROSSING_API_KEY` configuration
5. **Port Already in Use**: Change `PORT` environment variable

### Logs and Debugging

- CLI: Use `DEBUG=1` environment variable for verbose output
- API: Check server console for request/response logs
- Tools: Individual tools log errors to console

### Performance

- **Memory Usage**: Monitor for large file uploads or long conversations
- **API Rate Limits**: OpenAI API has rate limits that may affect performance
- **Streaming**: Use streaming responses for better perceived performance

## License

This project is part of the OpenAI Agents framework. See main project README for license details. 