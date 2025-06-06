import { z } from 'zod';
import { tool } from '@openai/agents';

// Time & Date Tool
export const timeTool = tool({
  name: 'get_time',
  description: 'Get current time, date, or timezone information',
  parameters: z.object({
    format: z
      .enum(['time', 'date', 'datetime', 'timestamp', 'timezone'])
      .describe('The time format to return'),
    timezone: z
      .string()
      .describe('Timezone (e.g., "America/New_York", "UTC", leave empty for local timezone)')
      .default(''),
  }),
  execute: async ({ format, timezone }) => {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions =
      timezone && timezone.trim() !== '' ? { timeZone: timezone } : {};

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
