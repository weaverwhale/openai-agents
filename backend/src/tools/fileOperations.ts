import { z } from 'zod';
import { tool } from '@openai/agents';
import fs from 'fs/promises';

// File Operations Tool
export const fileOperationsTool = tool({
  name: 'file_operations',
  description: 'Read, write, or list files and directories',
  parameters: z.object({
    operation: z.enum(['read', 'write', 'list']).describe('The file operation to perform'),
    filepath: z.string().describe('Path to the file or directory'),
    content: z
      .string()
      .describe('Content to write (only for write operation, leave empty for read/list operations)')
      .default(''),
  }),
  needsApproval: async (_ctx, { operation, filepath }) => {
    // Require approval for write operations or sensitive file paths
    if (operation === 'write') return true;
    const sensitivePaths = ['/etc', '/usr', '/system', 'package.json', '.env'];
    return sensitivePaths.some((path) => filepath.toLowerCase().includes(path.toLowerCase()));
  },
  execute: async ({ operation, filepath, content }) => {
    try {
      switch (operation) {
        case 'read':
          const fileContent = await fs.readFile(filepath, 'utf-8');
          return `Content of ${filepath}:\n${fileContent}`;

        case 'write':
          if (!content || content.trim() === '')
            throw new Error('Content is required for write operation');
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
