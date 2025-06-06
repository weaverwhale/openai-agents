# 🤖 Mega Agent - Intelligent CLI Assistant

A powerful conversational AI assistant that combines streaming responses, human-in-the-loop approvals, and a comprehensive set of tools for various tasks including real-time weather data, web search, calculations, file operations, system information, AI image generation, e-commerce analytics, forecasting, and GitHub reporting.

## Features

- **Streaming Responses**: Real-time streaming of AI responses for better user experience
- **Human-in-the-Loop**: Approval system for sensitive operations
- **Real-time Web Search**: AI-powered web search using OpenAI's web_search_preview tool
- **Live Weather Data**: Current weather information using Visual Crossing API
- **AI Image Generation**: Create images using OpenAI's DALL-E 3 model
- **E-commerce Analytics**: Triple Whale Moby integration for business insights
- **Time Series Forecasting**: Statistical forecasting with multiple algorithms
- **GitHub Activity Reports**: Comprehensive weekly contribution reports
- **Modular Tools**: Easily extensible tool system with 12 built-in tools
- **Beautiful CLI**: Colorful and intuitive command-line interface using Chalk
- **Conversational**: Natural back-and-forth conversations with context

## Installation

### 1. Install dependencies

```bash
npm install
```

### 2. Set up your environment variables

```bash
# Create a .env file with the following variables:
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini  # Optional, defaults to gpt-4o-mini
VISUAL_CROSSING_API_KEY=your_visual_crossing_api_key_here
GITHUB_TOKEN=your_github_token_here  # Optional, for GitHub weekly reports
```

## Usage

### Development

```bash
npm start
# or
npm run dev
```

### Build for Distribution

Create a standalone executable that can be run without Node.js:

```bash
npm run build
```

This creates `./bin/openai-agents` - a standalone executable you can distribute.

### Install Globally

Install as a global CLI tool:

```bash
npm run install-global
# Then run from anywhere:
openai-agents
```

### Special Commands

- `help` - Show available commands and examples
- `clear` - Clear the screen
- `exit` or `quit` - Exit the application
- `Ctrl+C` - Graceful shutdown

## Available Tools

The Mega Agent comes with powerful built-in tools:

### Core Tools

1. **🌤️ Weather Tool**: Get real-time weather data using coordinates
2. **🔍 Search Tool**: AI-powered web search with current information
3. **🧮 Calculator Tool**: Perform mathematical calculations
4. **📁 File Operations Tool**: Read, write, and list files/directories
5. **⏰ Time Tool**: Get current time, date, and timezone information
6. **💻 System Info Tool**: Retrieve system information (OS, memory, CPU, etc.)

### Advanced Tools

7. **🎨 Image Generation Tool**: Create images using OpenAI's DALL-E 3 model
8. **🐋 Moby Tool**: E-commerce analytics via Triple Whale's AI platform
9. **🗣️ Urban Dictionary Tool**: Look up slang definitions and meanings
10. **📚 Wikipedia Tool**: Get article summaries and information
11. **📈 Forecast Tool**: Time series forecasting with statistical analysis
12. **📊 Weekly Report Tool**: GitHub activity and contribution reports

## Adding New Tools

To add a new tool, create a new file in `src/tools/` and add it to the exports:

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

// Add to src/tools/index.ts
export const allTools = [
  // ... existing tools
  myNewTool,
];
```

## Human-in-the-Loop Approvals

Some tools require approval before execution for security and safety:

- **File Operations**: Write operations and sensitive file paths
- **Search Tool**: Searches containing sensitive terms
- **Image Generation**: All image generation requests (content filtering)
- **Moby Tool**: Sensitive business queries and non-default shops
- **Urban Dictionary**: All requests (explicit content)
- **Forecast Tool**: Large datasets or long-term forecasts
- **Weekly Report Tool**: All GitHub API access requests
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

```bash
├── src/
│   ├── mega-agent.ts          # Main conversational agent
│   ├── prompt.ts              # System prompt configuration
│   └── tools/
│       ├── index.ts           # All tool exports (12 tools)
│       ├── weather.ts         # Weather tool
│       ├── search.ts          # Web search tool
│       ├── calculator.ts      # Mathematical calculations
│       ├── fileOperations.ts  # File operations
│       ├── getTime.ts         # Time and date
│       ├── systemInfo.ts      # System information
│       ├── generateImage.ts   # AI image generation
│       ├── moby.ts           # Triple Whale e-commerce analytics
│       ├── urbanDictionary.ts # Slang definitions
│       ├── wikipedia.ts       # Wikipedia summaries
│       ├── forecast.ts        # Time series forecasting
│       └── weeklyReport.ts    # GitHub activity reports
├── uploads/               # Generated images storage
├── package.json          # Dependencies and scripts
└── README.md            # This file
```

## Distribution

### Creating Executables

The project is configured to create standalone executables using esbuild:

```bash
# Build executable for your platform
npm run build

# Install as global command
npm run install-global
```

### Distribution Options

1. **GitHub Releases**: Upload `./bin/openai-agents` to GitHub releases
2. **NPM Package**: Publish to npm registry for global installation
3. **Direct Download**: Host the executable file for direct download

Users can run the executable directly without installing Node.js or dependencies.

## Development

### Environment Variables

Create a `.env` file with:

```bash
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini  # Optional, defaults to gpt-4o-mini
VISUAL_CROSSING_API_KEY=your_visual_crossing_api_key_here
GITHUB_TOKEN=your_github_token_here  # Optional, for GitHub weekly reports
```

### API Keys Required

1. **OpenAI API Key**: Get from [OpenAI Platform](https://platform.openai.com/api-keys)
   - Used for: AI conversations, web search, and image generation

2. **Visual Crossing Weather API Key**: Get from [Visual Crossing](https://www.visualcrossing.com/weather-api)
   - Used for: Real-time weather data

3. **GitHub Token** (Optional): Get from [GitHub Settings](https://github.com/settings/tokens)
   - Used for: GitHub weekly activity reports
   - Requires: `repo` scope for private repositories, or no scopes for public only

## License

MIT License

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add your tool to `src/tools/` directory and update the `allTools` array in `src/tools/index.ts`
4. Test your changes
5. Submit a pull request

---

Made with ❤️ using OpenAI Agents SDK
