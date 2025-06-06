import { Agent, run } from '@openai/agents';
import chalk from 'chalk';
import readline from 'node:readline/promises';
import dotenv from 'dotenv';
import { allTools } from './tools';
import { generateMegaAgentPrompt } from './prompt';

dotenv.config();

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Loading animation
class LoadingAnimation {
  private interval: NodeJS.Timeout | null = null;
  private frame = 0;
  private frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  private message = '';

  start(message: string = 'Thinking') {
    this.message = message;
    this.frame = 0;
    
    process.stdout.write('\n');
    this.interval = setInterval(() => {
      process.stdout.write(`\r${chalk.cyan(this.frames[this.frame])} ${chalk.gray(this.message)}...`);
      this.frame = (this.frame + 1) % this.frames.length;
    }, 100);
  }

  updateMessage(message: string) {
    this.message = message;
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      process.stdout.write('\r' + ' '.repeat(50) + '\r'); // Clear the line
    }
  }
}

// Tool usage indicator
function showToolUsage(toolName: string, args?: any) {
  const toolEmojis: { [key: string]: string } = {
    'get_weather': '🌤️',
    'search': '🔍',
    'calculator': '🧮',
    'file_operations': '📁',
    'get_time': '⏰',
    'system_info': '💻'
  };
  
  const emoji = toolEmojis[toolName] || '🔧';
  const toolDisplayName = toolName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  
  console.log(chalk.bgMagenta.white.bold(`  ${emoji} USING TOOL: ${toolDisplayName}  `));
  if (args && Object.keys(args).length > 0) {
    console.log(chalk.magenta('━'.repeat(40)));
    Object.entries(args).forEach(([key, value]) => {
      const displayValue = typeof value === 'string' && value.length > 50 
        ? value.substring(0, 50) + '...' 
        : value;
      console.log(chalk.gray(`${key}: ${displayValue}`));
    });
    console.log(chalk.magenta('━'.repeat(40)));
  }
  console.log();
}

// Prompt user for yes/no confirmation
async function confirm(question: string): Promise<boolean> {
  const answer = await rl.question(chalk.yellow(`${question} (y/n): `));
  return ['y', 'yes'].includes(answer.trim().toLowerCase());
}

// Beautiful welcome message
function displayWelcome() {
  console.clear();
  console.log(chalk.bgBlue.white.bold('  🤖 MEGA AGENT - Your AI Assistant  '));
  console.log(chalk.blue('━'.repeat(50)));
  console.log(chalk.cyan('Welcome to your intelligent CLI assistant!'));
  console.log(chalk.gray('I can help you with:'));
  console.log(chalk.gray('• Web search and general search queries'));
  console.log(chalk.gray('• Weather information'));
  console.log(chalk.gray('• Mathematical calculations'));
  console.log(chalk.gray('• File operations'));
  console.log(chalk.gray('• System information'));
  console.log(chalk.gray('• Random generation'));
  console.log(chalk.gray('• Time and date queries'));
  console.log(chalk.gray('• And much more!'));
  console.log();
  console.log(chalk.yellow('Type "exit" to quit, "help" for assistance, or ask me anything!'));
  console.log(chalk.blue('━'.repeat(50)));
  console.log();
}

// Display help information
function displayHelp() {
  console.log(chalk.bgGreen.white.bold('  📚 HELP - Available Commands  '));
  console.log(chalk.green('━'.repeat(50)));
  console.log(chalk.white('General commands:'));
  console.log(chalk.gray('• "exit" or "quit" - Exit the application'));
  console.log(chalk.gray('• "clear" - Clear the screen'));
  console.log(chalk.gray('• "help" - Show this help message'));
  console.log();
  console.log(chalk.white('Available tools (I can use these automatically):'));
  console.log(chalk.gray('• Search: "Search for information about TypeScript"'));
  console.log(chalk.gray('• Weather: "What\'s the weather at coordinates 35.6762, 139.6503?"'));
  console.log(chalk.gray('• Calculator: "Calculate 25 * 8 + 10"'));
  console.log(chalk.gray('• File ops: "List files in this directory"'));
  console.log(chalk.gray('• Time: "What time is it in New York?"'));
  console.log(chalk.gray('• Random: "Generate a random number between 1 and 100"'));
  console.log(chalk.gray('• System: "Show system information"'));
  console.log();
  console.log(chalk.yellow('Just ask me anything in natural language!'));
  console.log(chalk.green('━'.repeat(50)));
  console.log();
}

// Handle stream with enhanced tool detection and loading management
async function handleStreamWithToolTracking(stream: any, loader: LoadingAnimation): Promise<void> {
  let isFirstChunk = true;
  let hasShownTools = false;
  
  const textStream = stream.toTextStream({ compatibleWithNodeStreams: true });
  
  // Poll for tool usage while streaming
  const toolCheckInterval = setInterval(() => {
    if (stream.state && !hasShownTools) {
      // Check if there are any tool calls in progress or completed
      const toolCalls = stream.state.toolCalls || [];
      const pendingToolCalls = stream.state.pendingToolCalls || [];
      
      if (toolCalls.length > 0 || pendingToolCalls.length > 0) {
        loader.updateMessage('Using tools');
        
        // Show tool usage for completed calls
        for (const toolCall of toolCalls) {
          if (toolCall.name && !hasShownTools) {
            loader.stop();
            showToolUsage(toolCall.name, toolCall.input || {});
            hasShownTools = true;
          }
        }
        
        // Show tool usage for pending calls
        for (const toolCall of pendingToolCalls) {
          if (toolCall.name && !hasShownTools) {
            loader.stop();
            showToolUsage(toolCall.name, toolCall.input || {});
            hasShownTools = true;
          }
        }
      }
    }
  }, 100);
  
  textStream.on('data', (chunk: Buffer) => {
    if (isFirstChunk) {
      loader.stop();
      clearInterval(toolCheckInterval);
      process.stdout.write(chalk.green('🤖 '));
      isFirstChunk = false;
    }
    process.stdout.write(chalk.white(chunk.toString()));
  });
  
  await stream.completed;
  clearInterval(toolCheckInterval);
  
  // Final check for tool usage if we missed it
  if (!hasShownTools && stream.state && stream.state.toolCalls) {
    const toolsUsed = new Set<string>();
    for (const toolCall of stream.state.toolCalls) {
      const toolName = toolCall.name;
      if (toolName && !toolsUsed.has(toolName)) {
        toolsUsed.add(toolName);
        console.log(chalk.gray(`\n[Used: ${toolName}]`));
      }
    }
  }
}

// Handle tool approvals with beautiful formatting
async function handleApprovals(stream: any): Promise<any> {
  while (stream.interruptions?.length) {
    console.log();
    console.log(chalk.bgYellow.black.bold('  ⚠️  APPROVAL REQUIRED  '));
    console.log(chalk.yellow('━'.repeat(40)));
    
    const state = stream.state;
    for (const interruption of stream.interruptions) {
      // Show enhanced tool usage information
      const toolName = interruption.rawItem.name;
      const args = JSON.parse(interruption.rawItem.arguments || '{}');
      
      console.log(chalk.cyan(`Agent: ${interruption.agent.name}`));
      showToolUsage(toolName, args);
      console.log(chalk.gray(`Arguments: ${interruption.rawItem.arguments}`));
      console.log();
      
      const approved = await confirm('Do you approve this tool usage?');
      
      if (approved) {
        console.log(chalk.green('✅ Approved'));
        state.approve(interruption);
      } else {
        console.log(chalk.red('❌ Rejected'));
        state.reject(interruption);
      }
      console.log();
    }

    console.log(chalk.yellow('━'.repeat(40)));
    console.log(chalk.cyan('Continuing execution...'));
    console.log();

    // Resume execution with streaming output
    stream = await run(mainAgent, state, { stream: true });
    
    // Stream the response with beautiful formatting
    let isFirstChunk = true;
    const textStream = stream.toTextStream({ compatibleWithNodeStreams: true });
    
    textStream.on('data', (chunk) => {
      if (isFirstChunk) {
        process.stdout.write(chalk.green('🤖 '));
        isFirstChunk = false;
      }
      process.stdout.write(chalk.white(chunk.toString()));
    });
    
    await stream.completed;
  }
  
  return stream;
}

// Create the main mega agent with all tools
const mainAgent = new Agent({
  name: 'Mega Agent',
  instructions: generateMegaAgentPrompt,
  tools: allTools,
});

// Main conversation loop
async function startConversation() {
  displayWelcome();
  
  let conversationHistory: Array<{ role: string; content: string }> = [];
  
  while (true) {
    try {
      // Get user input
      const userInput = await rl.question(chalk.blue('You: '));
      
      // Handle special commands
      if (userInput.toLowerCase().trim() === 'exit' || userInput.toLowerCase().trim() === 'quit') {
        console.log(chalk.green('\n👋 Goodbye! Thanks for using Mega Agent!'));
        break;
      }
      
      if (userInput.toLowerCase().trim() === 'clear') {
        displayWelcome();
        continue;
      }
      
      if (userInput.toLowerCase().trim() === 'help') {
        displayHelp();
        continue;
      }
      
      if (userInput.trim() === '') {
        continue;
      }
      
      // Add user input to history
      conversationHistory.push({ role: 'user', content: userInput });
      
      // Start loading animation
      const loader = new LoadingAnimation();
      loader.start('Processing your request');
      
      try {
        // Run the agent with streaming
        let stream = await run(mainAgent, userInput, { stream: true });
        
        // Monitor for tool usage and stream responses with better tool detection
        await handleStreamWithToolTracking(stream, loader);
        
        // Handle any tool approvals
        stream = await handleApprovals(stream);
        
        console.log('\n'); // Add spacing after response
        
      } catch (streamError) {
        loader.stop();
        throw streamError;
      }
      
    } catch (error) {
      console.error(chalk.red('\n❌ Error occurred:'), error);
      console.log(chalk.yellow('Please try again with a different question.\n'));
    }
  }
  
  rl.close();
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log(chalk.green('\n\n👋 Goodbye! Thanks for using Mega Agent!'));
  rl.close();
  process.exit(0);
});

// Start the application
async function main() {
  try {
    await startConversation();
  } catch (error) {
    console.error(chalk.red('Fatal error:'), error);
    process.exit(1);
  }
}

// Export for potential use as a module
export { mainAgent, allTools };

// Run if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
} 