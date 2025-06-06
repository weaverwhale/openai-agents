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
    'system_info': '💻',
    'generate_image': '🎨',
    'moby': '🐋',
    'urban_dictionary': '🗣️',
    'wikipedia': '📚',
    'forecast': '📈',
    'weekly_report': '📊'
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
  console.log(chalk.gray('• Image generation using AI'));
  console.log(chalk.gray('• E-commerce analytics via Triple Whale Moby'));
  console.log(chalk.gray('• Slang definitions via Urban Dictionary'));
  console.log(chalk.gray('• Wikipedia summaries and information'));
  console.log(chalk.gray('• Time series forecasting and predictions'));
  console.log(chalk.gray('• GitHub weekly activity reports'));
  console.log(chalk.gray('• Random generation'));
  console.log(chalk.gray('• Time and date queries'));
  console.log(chalk.gray('• And much more!'));
  console.log();
  console.log(chalk.yellow('Type "exit" to quit, "help" for assistance, "history" to see our chat, or ask me anything!'));
  console.log(chalk.blue('━'.repeat(50)));
  console.log();
}

// Display help information
function displayHelp() {
  console.log(chalk.bgGreen.white.bold('  📚 HELP - Available Commands  '));
  console.log(chalk.green('━'.repeat(50)));
  console.log(chalk.white('General commands:'));
  console.log(chalk.gray('• "exit" or "quit" - Exit the application'));
  console.log(chalk.gray('• "clear" - Clear the screen and reset conversation history'));
  console.log(chalk.gray('• "history" - Show conversation history'));
  console.log(chalk.gray('• "help" - Show this help message'));
  console.log();
  console.log(chalk.white('Available tools (I can use these automatically):'));
  console.log(chalk.gray('• Search: "Search for information about TypeScript"'));
  console.log(chalk.gray('• Weather: "What\'s the weather at coordinates 35.6762, 139.6503?"'));
  console.log(chalk.gray('• Calculator: "Calculate 25 * 8 + 10"'));
  console.log(chalk.gray('• File ops: "List files in this directory"'));
  console.log(chalk.gray('• Image gen: "Generate an image of a sunset over mountains"'));
  console.log(chalk.gray('• Moby: "What are my top selling products this month?"'));
  console.log(chalk.gray('• Urban Dict: "What does \'lit\' mean?"'));
  console.log(chalk.gray('• Wikipedia: "Tell me about quantum computing"'));
  console.log(chalk.gray('• Forecast: "Predict sales for next 5 days using [100,110,105,120,115]"'));
  console.log(chalk.gray('• Weekly Report: "Generate GitHub report for user \'johndoe\'"'));
  console.log(chalk.gray('• Time: "What time is it in New York?"'));
  console.log(chalk.gray('• Random: "Generate a random number between 1 and 100"'));
  console.log(chalk.gray('• System: "Show system information"'));
  console.log();
  console.log(chalk.yellow('Just ask me anything in natural language!'));
  console.log(chalk.green('━'.repeat(50)));
  console.log();
}

// Handle stream with enhanced tool detection and loading management
async function handleStreamWithToolTracking(stream: any, loader: LoadingAnimation): Promise<string> {
  let isFirstChunk = true;
  let hasShownTools = false;
  let accumulatedResponse = '';
  
  try {
    // Use event iteration to handle both text and tool detection
    for await (const event of stream) {
      // Handle raw model events for text output
      if (event.type === 'raw_model_stream_event') {
        // Handle text deltas - fix the condition based on debug output
        if (event.data?.type === 'output_text_delta' && event.data?.delta) {
          if (isFirstChunk) {
            loader.stop();
            // Don't add \n - the loader.stop() already positions us correctly
            process.stdout.write(chalk.green('🤖 '));
            isFirstChunk = false;
            process.stdout.write(chalk.white(event.data.delta));
          } else {
            process.stdout.write(chalk.white(event.data.delta));
          }
          // Accumulate the response text for conversation history
          accumulatedResponse += event.data.delta;
        }
      }
      // Handle run item events for tool calls
      else if (event.type === 'run_item_stream_event') {
        if (event.item?.type === 'tool_call_item' && !hasShownTools) {
          if (!isFirstChunk) {
            process.stdout.write('\n'); // Add newline before tool usage display
          }
          loader.stop();
          
          // Extract tool name and arguments from the correct location
          const toolName = event.item.rawItem?.name || 'unknown_tool';
          
          let toolArgs = {};
          try {
            // Arguments are stored as a JSON string in rawItem.arguments
            if (event.item.rawItem?.arguments) {
              toolArgs = JSON.parse(event.item.rawItem.arguments);
            }
          } catch (error) {
            // If parsing fails, use the raw string
            toolArgs = { arguments: event.item.rawItem?.arguments || 'No arguments' };
          }
          
          showToolUsage(toolName, toolArgs);
          hasShownTools = true;
          // Start a new loader for tool execution (no extra spacing)
          loader.start('Executing tool');
        }
        else if (event.item?.type === 'tool_call_output_item' && hasShownTools) {
          loader.stop();
          loader.start('Processing results');
        }
      }
      // Handle agent updates
      else if (event.type === 'agent_updated_stream_event') {
        if (!isFirstChunk) {
          console.log(chalk.cyan(`\n[Agent switched to: ${event.agent?.name || 'Unknown'}]`));
        }
      }
    }
  } catch (error) {
    loader.stop();
    console.log(chalk.red('\n❌ Streaming error:'), error);
    // Fallback to toTextStream if event iteration fails
    try {
      console.log(chalk.yellow('Falling back to text stream...'));
      const textStream = stream.toTextStream({ compatibleWithNodeStreams: true });
      textStream.on('data', (chunk: Buffer) => {
        const chunkText = chunk.toString();
        if (isFirstChunk) {
          process.stdout.write(chalk.green('🤖 '));
          isFirstChunk = false;
        }
        process.stdout.write(chalk.white(chunkText));
        accumulatedResponse += chunkText;
      });
      await stream.completed;
    } catch (fallbackError) {
      console.log(chalk.red('Text streaming also failed:'), fallbackError);
    }
  }
  
  // Ensure loader is stopped
  loader.stop();
  
  return accumulatedResponse.trim();
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
    
    // Use single event iteration approach for resumed execution
    let isFirstChunk = true;
    
    try {
      for await (const event of stream) {
        // Handle raw model events for text output
        if (event.type === 'raw_model_stream_event') {
          // Handle text deltas - fix the condition
          if (event.data?.type === 'output_text_delta' && event.data?.delta) {
            if (isFirstChunk) {
              process.stdout.write(chalk.green('🤖 '));
              isFirstChunk = false;
            }
            process.stdout.write(chalk.white(event.data.delta));
          }
        }
        // Handle run item events for tool calls during resumed execution
        else if (event.type === 'run_item_stream_event') {
          if (event.item?.type === 'tool_call_item') {
            console.log(chalk.gray(`\n[Tool called: ${event.item.name}]`));
          }
        }
      }
    } catch (error) {
      console.log(chalk.red('\n❌ Resume streaming error:'), error);
      // Fallback to toTextStream
      try {
        const textStream = stream.toTextStream({ compatibleWithNodeStreams: true });
        textStream.on('data', (chunk: Buffer) => {
          if (isFirstChunk) {
            process.stdout.write(chalk.green('🤖 '));
            isFirstChunk = false;
          }
          process.stdout.write(chalk.white(chunk.toString()));
        });
        await stream.completed;
      } catch (fallbackError) {
        console.log(chalk.red('Resume text streaming also failed:'), fallbackError);
      }
    }
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
        conversationHistory = []; // Reset conversation history
        displayWelcome();
        continue;
      }
      
      if (userInput.toLowerCase().trim() === 'help') {
        displayHelp();
        continue;
      }
      
      if (userInput.toLowerCase().trim() === 'history') {
        console.log(chalk.bgCyan.white.bold('  📚 CONVERSATION HISTORY  '));
        console.log(chalk.cyan('━'.repeat(50)));
        if (conversationHistory.length === 0) {
          console.log(chalk.gray('No conversation history yet.'));
        } else {
          conversationHistory.forEach((msg, index) => {
            const roleColor = msg.role === 'user' ? chalk.blue : chalk.green;
            const roleLabel = msg.role === 'user' ? 'You' : '🤖 Agent';
            console.log(roleColor(`${index + 1}. ${roleLabel}:`));
            console.log(chalk.gray(`   ${msg.content.slice(0, 100)}${msg.content.length > 100 ? '...' : ''}`));
            console.log();
          });
        }
        console.log(chalk.cyan('━'.repeat(50)));
        console.log();
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
        // Convert conversation history to AgentInputItem format
        const agentInputItems = conversationHistory.map(msg => ({
          role: msg.role === 'user' ? 'user' as const : 'system' as const,
          content: msg.content,
          type: 'message' as const
        }));
        
        // Run the agent with conversation history for context
        let stream = await run(mainAgent, agentInputItems, { stream: true });
        
        // Monitor for tool usage and stream responses with proper event handling
        const agentResponse = await handleStreamWithToolTracking(stream, loader);
        
        // Add agent response to conversation history
        if (agentResponse) {
          conversationHistory.push({ role: 'assistant', content: agentResponse });
        }
        
        // Handle any tool approvals
        await handleApprovals(stream);
        
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