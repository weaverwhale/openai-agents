import { z } from 'zod';
import { tool } from '@openai/agents';
import fs from 'fs/promises';
import path from 'path';
import { client, model } from './openai';
import { generateWebSearchPrompt } from './prompt';

// Search interfaces
interface SearchSource {
  title: string;
  snippet: string;
  url: string;
}

interface SearchResponse {
  answer: string;
  sources: SearchSource[];
}

// Search function using OpenAI's web search
export const search = async (query?: string): Promise<SearchResponse | { error: string }> => {
  if (!query) {
    return { error: 'Query is required' };
  }

  try {
    // Generate OpenAI Prompt
    const prompt = generateWebSearchPrompt(query);

    // Call OpenAI's Responses API
    // Uses the built-in web_search_preview tool to get real-time data
    const response = await client.responses.create({
      model,
      tools: [{ type: 'web_search_preview' }],
      tool_choice: 'required',
      input: prompt,
    });

    // Extract answer from response
    const answer = response.output_text || 'No answer available';

    // Return empty sources array for now
    const sources: SearchSource[] = [];

    return {
      answer,
      sources,
    };
  } catch (error) {
    console.error('Search API Error:', error);
    return { error: 'An error occurred while processing the search request' };
  }
};

// Weather data interface
export interface WeatherData {
  location: string;
  temperature: number;
  description: string;
  icon: string;
  humidity: number;
  windSpeed: number;
  feelsLike: number;
}

// Weather API function using Visual Crossing
export const getWeather = async (lat: number, lon: number): Promise<WeatherData> => {
  const API_KEY = process.env.VISUAL_CROSSING_API_KEY;

  if (!API_KEY) {
    throw new Error('Visual Crossing API key not found');
  }

  try {
    // Visual Crossing API uses lat,lon format
    const location = `${lat},${lon}`;
    const response = await fetch(
      `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${location}?unitGroup=metric&include=current&key=${API_KEY}&contentType=json`
    );

    if (!response.ok) {
      throw new Error(`Weather API Error: ${response.status}`);
    }

    const data = await response.json();

    // Visual Crossing API response structure
    const currentConditions = data.currentConditions;

    return {
      location: data.resolvedAddress,
      temperature: Math.round(currentConditions.temp),
      description: currentConditions.conditions,
      icon: currentConditions.icon,
      humidity: currentConditions.humidity,
      windSpeed: currentConditions.windspeed,
      feelsLike: Math.round(currentConditions.feelslike),
    };
  } catch (error) {
    console.error('Weather API Error:', error);
    throw error;
  }
};

// Weather Tool
export const getWeatherTool = tool({
  name: 'get_weather',
  description: 'Get current weather information for a location using latitude and longitude coordinates',
  parameters: z.object({
    lat: z.number().describe('Latitude coordinate (-90 to 90)'),
    lon: z.number().describe('Longitude coordinate (-180 to 180)'),
  }),
  needsApproval: async (_ctx, { lat, lon }) => {
    // Require approval for potentially sensitive coordinates
    // You can customize this logic based on your needs
    return false; // No approval needed for weather data
  },
  execute: async ({ lat, lon }) => {
    try {
      // Validate coordinates
      if (isNaN(lat) || isNaN(lon)) {
        throw new Error('Invalid latitude or longitude coordinates');
      }
      
      if (lat < -90 || lat > 90) {
        throw new Error('Latitude must be between -90 and 90 degrees');
      }
      
      if (lon < -180 || lon > 180) {
        throw new Error('Longitude must be between -180 and 180 degrees');
      }

      const weather = await getWeather(lat, lon);
      
      return `
        Weather for ${weather.location}:
        🌡️ Temperature: ${weather.temperature}°C (feels like ${weather.feelsLike}°C)
        🌤️ Condition: ${weather.description}
        💧 Humidity: ${weather.humidity}%
        💨 Wind Speed: ${weather.windSpeed} km/h
        ☁️ Icon: ${weather.icon}
      `;
    } catch (error) {
      return `Error fetching weather data: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
    }
  },
});

// Search Tool
export const searchTool = tool({
  name: 'search',
  description: 'Search the web or perform general search queries',
  parameters: z.object({
    query: z.string().describe('The search query to execute'),
  }),
  needsApproval: async (_ctx, { query }) => {
    // You can add approval logic for sensitive searches if needed
    const sensitiveTerms = ['personal information', 'private data', 'passwords'];
    return sensitiveTerms.some(term => 
      query.toLowerCase().includes(term.toLowerCase())
    );
  },
  execute: async ({ query }) => {
    try {
      if (!query || query.trim() === '') {
        throw new Error('Search query cannot be empty');
      }

      const searchResults = await search(query.trim());
      
      // Check if there was an error
      if ('error' in searchResults) {
        throw new Error(searchResults.error);
      }
      
      let response = `🔍 Search Results for: "${query}"\n\n`;
      response += `📝 **Answer:**\n${searchResults.answer}\n\n`;
      
      if (searchResults.sources && searchResults.sources.length > 0) {
        response += `📊 **Sources:** (${searchResults.sources.length} found)\n`;
        searchResults.sources.forEach((source, index) => {
          response += `${index + 1}. **${source.title}**\n`;
          response += `   🔗 ${source.url}\n`;
          response += `   📝 ${source.snippet}\n\n`;
        });
      }
      
      return response;
    } catch (error) {
      return `Error performing search: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
    }
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
  searchTool,
  calculatorTool,
  fileOperationsTool,
  timeTool,
  systemInfoTool,
];
