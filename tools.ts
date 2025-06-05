import { z } from 'zod';
import { tool } from '@openai/agents';
import fs from 'fs/promises';
import path from 'path';

// Weather Tool
export const getWeatherTool = tool({
  name: 'get_weather',
  description: 'Get the weather for a given city',
  parameters: z.object({
    city: z.string().describe('The city to get weather for'),
  }),
  needsApproval: async (_ctx, { city }) => {
    // Require approval for certain sensitive locations
    const sensitiveLocations = ['Area 51', 'Pentagon', 'White House'];
    return sensitiveLocations.some(loc => 
      city.toLowerCase().includes(loc.toLowerCase())
    );
  },
  execute: async ({ city }) => {
    // Simulate weather API call
    const weatherConditions = ['sunny', 'cloudy', 'rainy', 'snowy', 'windy'];
    const temperatures = ['-5°C', '10°C', '20°C', '25°C', '30°C'];
    const condition = weatherConditions[Math.floor(Math.random() * weatherConditions.length)];
    const temp = temperatures[Math.floor(Math.random() * temperatures.length)];
    
    return `The weather in ${city} is ${condition} with a temperature of ${temp}.`;
  },
});

// Calculator Tool
export const calculatorTool = tool({
  name: 'calculator',
  description: 'Perform mathematical calculations',
  parameters: z.object({
    expression: z.string().describe('Mathematical expression to evaluate (e.g., "2 + 2", "sqrt(16)", "sin(30)")'),
  }),
  execute: async ({ expression }) => {
    try {
      // Simple math evaluation (in production, use a proper math library)
      const sanitized = expression.replace(/[^0-9+\-*/().\s]/g, '');
      const result = eval(sanitized);
      return `${expression} = ${result}`;
    } catch (error) {
      return `Error calculating "${expression}": ${error}`;
    }
  },
});

// File Operations Tool
export const fileOperationsTool = tool({
  name: 'file_operations',
  description: 'Read, write, or list files and directories',
  parameters: z.object({
    operation: z.enum(['read', 'write', 'list']).describe('The file operation to perform'),
    filepath: z.string().describe('Path to the file or directory'),
    content: z.string().optional().describe('Content to write (only for write operation)'),
  }),
  needsApproval: async (_ctx, { operation, filepath }) => {
    // Require approval for write operations or sensitive file paths
    if (operation === 'write') return true;
    const sensitivePaths = ['/etc', '/usr', '/system', 'package.json', '.env'];
    return sensitivePaths.some(path => filepath.toLowerCase().includes(path.toLowerCase()));
  },
  execute: async ({ operation, filepath, content }) => {
    try {
      switch (operation) {
        case 'read':
          const fileContent = await fs.readFile(filepath, 'utf-8');
          return `Content of ${filepath}:\n${fileContent}`;
        
        case 'write':
          if (!content) throw new Error('Content is required for write operation');
          await fs.writeFile(filepath, content, 'utf-8');
          return `Successfully wrote content to ${filepath}`;
        
        case 'list':
          const items = await fs.readdir(filepath);
          return `Contents of ${filepath}:\n${items.join('\n')}`;
        
        default:
          throw new Error('Invalid operation');
      }
    } catch (error) {
      return `Error performing ${operation} on ${filepath}: ${error}`;
    }
  },
});

// Time & Date Tool
export const timeTool = tool({
  name: 'get_time',
  description: 'Get current time, date, or timezone information',
  parameters: z.object({
    format: z.enum(['time', 'date', 'datetime', 'timestamp', 'timezone']).describe('The time format to return'),
    timezone: z.string().optional().describe('Timezone (e.g., "America/New_York", "UTC")'),
  }),
  execute: async ({ format, timezone }) => {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = timezone ? { timeZone: timezone } : {};
    
    switch (format) {
      case 'time':
        return `Current time: ${now.toLocaleTimeString('en-US', options)}`;
      case 'date':
        return `Current date: ${now.toLocaleDateString('en-US', options)}`;
      case 'datetime':
        return `Current date and time: ${now.toLocaleString('en-US', options)}`;
      case 'timestamp':
        return `Unix timestamp: ${Math.floor(now.getTime() / 1000)}`;
      case 'timezone':
        return `Current timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`;
      default:
        return `Current date and time: ${now.toLocaleString('en-US', options)}`;
    }
  },
});

// System Information Tool
export const systemInfoTool = tool({
  name: 'system_info',
  description: 'Get system information like OS, memory, CPU, etc.',
  parameters: z.object({
    info_type: z.enum(['os', 'memory', 'cpu', 'uptime', 'all']).describe('Type of system information to retrieve'),
  }),
  execute: async ({ info_type }) => {
    const os = await import('os');
    
    switch (info_type) {
      case 'os':
        return `OS: ${os.type()} ${os.release()} (${os.arch()})`;
      
      case 'memory':
        const totalMem = Math.round(os.totalmem() / 1024 / 1024 / 1024 * 100) / 100;
        const freeMem = Math.round(os.freemem() / 1024 / 1024 / 1024 * 100) / 100;
        return `Memory: ${freeMem}GB free of ${totalMem}GB total`;
      
      case 'cpu':
        const cpus = os.cpus();
        return `CPU: ${cpus[0].model} (${cpus.length} cores)`;
      
      case 'uptime':
        const uptime = Math.floor(os.uptime() / 3600);
        return `System uptime: ${uptime} hours`;
      
      case 'all':
        const allInfo = {
          os: `${os.type()} ${os.release()} (${os.arch()})`,
          hostname: os.hostname(),
          memory: `${Math.round(os.freemem() / 1024 / 1024 / 1024 * 100) / 100}GB free of ${Math.round(os.totalmem() / 1024 / 1024 / 1024 * 100) / 100}GB`,
          cpu: `${os.cpus()[0].model} (${os.cpus().length} cores)`,
          uptime: `${Math.floor(os.uptime() / 3600)} hours`
        };
        return `System Information:\n${Object.entries(allInfo).map(([key, value]) => `${key}: ${value}`).join('\n')}`;
      
      default:
        return 'Invalid system information type';
    }
  },
});

// Export all tools as an array for easy importing
export const allTools = [
  getWeatherTool,
  calculatorTool,
  fileOperationsTool,
  timeTool,
  systemInfoTool,
];
