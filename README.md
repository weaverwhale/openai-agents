# 🤖 Mega Agent - Intelligent CLI Assistant

A powerful conversational AI assistant that combines streaming responses, human-in-the-loop approvals, and a comprehensive set of tools for various tasks including real-time weather data, web search, calculations, file operations, and system information.

## Features

- **Streaming Responses**: Real-time streaming of AI responses for better user experience
- **Human-in-the-Loop**: Approval system for sensitive operations
- **Real-time Web Search**: AI-powered web search using OpenAI's web_search_preview tool
- **Live Weather Data**: Current weather information using Visual Crossing API
- **Modular Tools**: Easily extensible tool system with 6 built-in tools
- **Beautiful CLI**: Colorful and intuitive command-line interface using Chalk
- **Conversational**: Natural back-and-forth conversations with context

## Installation

1. Install dependencies:
```bash
npm install
```

2. Set up your environment variables:
```bash
# Create a .env file with the following variables:
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini  # Optional, defaults to gpt-4o-mini
VISUAL_CROSSING_API_KEY=your_visual_crossing_api_key_here
```

## Usage

### Start the Mega Agent
```bash
npm start
# or
npm run mega-agent
```

### Special Commands
- `help` - Show available commands and examples
- `clear` - Clear the screen
- `exit` or `quit` - Exit the application
- `Ctrl+C` - Graceful shutdown

## Available Tools

The Mega Agent comes with 6 powerful built-in tools:

1. **🌤️ Weather Tool**: Get real-time weather data using coordinates
2. **🔍 Search Tool**: AI-powered web search with current information
3. **🧮 Calculator Tool**: Perform mathematical calculations
4. **📁 File Operations Tool**: Read, write, and list files/directories
5. **⏰ Time Tool**: Get current time, date, and timezone information
6. **💻 System Info Tool**: Retrieve system information (OS, memory, CPU, etc.)

### Example Conversations

```
You: What's the weather at coordinates 37.7749, -122.4194?
🤖 I'll check the weather at those coordinates for you.

Weather for San Francisco, CA, United States:
🌡️ Temperature: 18°C (feels like 16°C)
🌤️ Condition: Partly Cloudy
💧 Humidity: 65%
💨 Wind Speed: 12 km/h
☁️ Icon: partly-cloudy-day

You: Search for the latest news about artificial intelligence
🤖 I'll search for the latest AI news for you.

🔍 Search Results for: "latest news about artificial intelligence"

📝 **Answer:**
Here are the latest developments in AI: [Current AI news and developments]

You: Calculate the square root of 144
🤖 I'll calculate that for you.

sqrt(144) = 12
```

## Adding New Tools

To add a new tool, edit `tools.ts`:

```typescript
export const myNewTool = tool({
  name: 'my_new_tool',
  description: 'Description of what this tool does',
  parameters: z.object({
    param1: z.string().describe('Description of parameter'),
  }),
  needsApproval: async (_ctx, { param1 }) => {
    // Return true if approval is needed
    return param1.includes('sensitive');
  },
  execute: async ({ param1 }) => {
    // Tool implementation
    return `Result: ${param1}`;
  },
});

// Add to allTools array
export const allTools = [
  // ... existing tools
  myNewTool,
];
```

## Human-in-the-Loop Approvals

Some tools require approval before execution for security and safety:
- **File Operations**: Write operations and sensitive file paths
- **Search Tool**: Searches containing sensitive terms
- **Custom Logic**: Any tool can implement custom approval logic

When approval is required, you'll see:
```
⚠️  APPROVAL REQUIRED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Agent: Mega Agent
Tool: file_operations
Arguments: {"operation":"write","filepath":"important.txt","content":"data"}

Do you approve this tool usage? (y/n):
```

## Project Structure

```
├── mega-agent.ts          # Main conversational agent
├── tools.ts              # All tool definitions (6 tools)
├── openai.ts             # OpenAI client configuration
├── prompt.ts             # Prompt templates for tools
├── streamed.ts           # Original streaming example
├── human-in-the-loop-stream.ts  # Original HITL example
├── package.json          # Dependencies and scripts
└── README.md            # This file
```

## Development

### Environment Variables
Create a `.env` file with:
```
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini  # Optional, defaults to gpt-4o-mini
VISUAL_CROSSING_API_KEY=your_visual_crossing_api_key_here
```

### API Keys Required

1. **OpenAI API Key**: Get from [OpenAI Platform](https://platform.openai.com/api-keys)
   - Used for: AI conversations and web search functionality
   
2. **Visual Crossing Weather API Key**: Get from [Visual Crossing](https://www.visualcrossing.com/weather-api)
   - Used for: Real-time weather data

## License

MIT License

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add your tool to `tools.ts` and update the `allTools` array
4. Test your changes
5. Submit a pull request

---

Made with ❤️ using OpenAI Agents SDK