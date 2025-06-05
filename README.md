# 🤖 Mega Agent - Intelligent CLI Assistant

A powerful conversational AI assistant that combines streaming responses, human-in-the-loop approvals, and a comprehensive set of tools for various tasks.

## Features

- **Streaming Responses**: Real-time streaming of AI responses for better user experience
- **Human-in-the-Loop**: Approval system for sensitive operations
- **Modular Tools**: Easily extensible tool system
- **Beautiful CLI**: Colorful and intuitive command-line interface using Chalk
- **Conversational**: Natural back-and-forth conversations with context

## Available Tools

### 🌤️ Weather Tool
- Get weather information for any city
- Example: "What's the weather in Tokyo?"

### 🧮 Calculator Tool
- Perform mathematical calculations
- Example: "Calculate 25 * 8 + 10"

### 📁 File Operations Tool
- Read, write, and list files/directories
- **Requires approval** for write operations and sensitive paths
- Example: "List files in this directory"

### ⏰ Time & Date Tool
- Get current time, date, or timezone information
- Example: "What time is it in New York?"

### 🎲 Random Generator Tool
- Generate random numbers, strings, choices, or UUIDs
- Example: "Generate a random number between 1 and 100"

### 💻 System Information Tool
- Get OS, memory, CPU, and uptime information
- Example: "Show system information"

## Installation

1. Install dependencies:
```bash
npm install
```

2. Set up your environment variables:
```bash
cp .env.example .env
# Add your OpenAI API key to .env
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

### Example Conversations

```
You: What's the weather in San Francisco?
🤖 I'll check the weather in San Francisco for you.
The weather in San Francisco is sunny with a temperature of 20°C.

You: Calculate the square root of 144
🤖 I'll calculate that for you.
sqrt(144) = 12

You: What time is it?
🤖 Current date and time: 12/20/2024, 3:45:30 PM
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

Some tools require approval before execution:
- **File Operations**: Write operations and sensitive file paths
- **Weather Tool**: Sensitive locations (Area 51, Pentagon, etc.)
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
├── tools.ts              # All tool definitions
├── streamed.ts           # Original streaming example
├── human-in-the-loop-stream.ts  # Original HITL example
├── package.json          # Dependencies and scripts
└── README.md            # This file
```

## Development

### Running Other Examples
```bash
# Original streaming example
npm run streamed

# Original human-in-the-loop example
npm run human-in-the-loop-stream
```

### Environment Variables
Create a `.env` file with:
```
OPENAI_API_KEY=your_api_key_here
```

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