import { Agent, run } from '@openai/agents';
import chalk from 'chalk';
import readline from 'node:readline/promises';
import dotenv from 'dotenv';
import { allTools } from './tools';

dotenv.config();

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

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
  console.log(chalk.gray('• Weather: "What\'s the weather at coordinates 35.6762, 139.6503?"'));
  console.log(chalk.gray('• Search: "Search for information about TypeScript"'));
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

// Handle tool approvals with beautiful formatting
async function handleApprovals(stream: any): Promise<any> {
  while (stream.interruptions?.length) {
    console.log();
    console.log(chalk.bgYellow.black.bold('  ⚠️  APPROVAL REQUIRED  '));
    console.log(chalk.yellow('━'.repeat(40)));
    
    const state = stream.state;
    for (const interruption of stream.interruptions) {
      console.log(chalk.cyan(`Agent: ${interruption.agent.name}`));
      console.log(chalk.white(`Tool: ${interruption.rawItem.name}`));
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
  instructions: `You are a helpful and intelligent AI assistant with access to various tools. 
  
  Your capabilities include:
  - Real-time weather information using latitude and longitude coordinates
  - Web search and general search queries
  - Mathematical calculations and computations
  - File and directory operations (reading, writing, listing)
  - System information retrieval
  - Time and date queries with timezone support
  - Random number/string/choice generation
  
  Guidelines:
  - Be helpful, friendly, and conversational
  - Use tools when appropriate to provide accurate information
  - Explain what you're doing when using tools
  - If a tool requires approval, explain why it's needed
  - Format your responses clearly and concisely
  - If you can't help with something, explain why and suggest alternatives
  - For weather requests, you'll need latitude and longitude coordinates
  
  Always maintain a professional yet friendly tone in your responses.`,
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
      
      console.log(); // Add spacing
      
      // Run the agent with streaming
      let stream = await run(mainAgent, userInput, { stream: true });
      
      // Stream the initial response
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
      
      // Handle any tool approvals
      stream = await handleApprovals(stream);
      
      console.log('\n'); // Add spacing after response
      
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