import { z } from 'zod';
import { tool } from '@openai/agents';

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