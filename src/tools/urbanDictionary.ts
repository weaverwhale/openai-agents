import { z } from 'zod';
import { tool } from '@openai/agents';

// Define the parameter types to match the zod schema
type UrbanDictionaryParams = {
  term: string;
};

// Urban Dictionary lookup function
export const lookupUrbanDictionary = async (
  term: string,
): Promise<{ definition: string } | { error: string }> => {
  if (!term) {
    return { error: 'Term is required' };
  }

  try {
    // Use Urban Dictionary's API endpoint (unofficial but commonly used)
    const apiUrl = `https://api.urbandictionary.com/v0/define?term=${encodeURIComponent(term)}`;

    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();

    if (!data.list || data.list.length === 0) {
      return { error: `No definitions found for "${term}"` };
    }

    // Get the top definition (most upvoted)
    const topDefinition = data.list[0];

    // Clean up the definition text (Urban Dictionary uses [square brackets] for linked terms)
    const cleanDefinition = topDefinition.definition
      .replace(/\[([^\]]+)\]/g, '$1') // Remove square brackets around linked terms
      .replace(/\r\n/g, '\n') // Normalize line breaks
      .trim();

    const cleanExample = topDefinition.example
      ?.replace(/\[([^\]]+)\]/g, '$1')
      ?.replace(/\r\n/g, '\n')
      ?.trim();

    let result = `**${topDefinition.word}**\n\n`;
    result += `📝 **Definition:** ${cleanDefinition}\n\n`;

    if (cleanExample) {
      result += `💬 **Example:** ${cleanExample}\n\n`;
    }

    result += `👍 ${topDefinition.thumbs_up} 👎 ${topDefinition.thumbs_down}\n`;
    result += `👤 **By:** ${topDefinition.author}\n`;
    result += `📅 **Written:** ${new Date(topDefinition.written_on).toLocaleDateString()}`;

    return { definition: result };
  } catch (error) {
    console.error('Error querying Urban Dictionary:', error);
    return { error: 'Could not fetch definition from Urban Dictionary' };
  }
};

// Urban Dictionary Tool
export const urbanDictionaryTool = tool({
  name: 'urban_dictionary',
  description:
    'Look up slang definitions and internet culture terms from Urban Dictionary. Useful for understanding modern slang, internet terminology, and pop culture references.',
  parameters: z.object({
    term: z.string().describe('The term to look up in Urban Dictionary'),
  }),
  needsApproval: async (_ctx, { term }) => {
    // Add approval logic for potentially inappropriate content
    // Urban Dictionary often contains explicit content, so we'll be conservative
    const explicitIndicators = ['sex', 'drug', 'nsfw', 'explicit'];
    const mightBeExplicit = explicitIndicators.some((indicator) =>
      term.toLowerCase().includes(indicator.toLowerCase()),
    );

    // Always require approval for Urban Dictionary lookups due to potentially explicit content
    return true; // Always require approval for Urban Dictionary
  },
  execute: async ({ term }) => {
    try {
      if (!term || term.trim() === '') {
        throw new Error('Term cannot be empty');
      }

      const result = await lookupUrbanDictionary(term.trim());

      // Check if there was an error
      if ('error' in result) {
        throw new Error(result.error);
      }

      let response = `🗣️ **Urban Dictionary Lookup**\n\n`;
      response += `🔍 **Search Term:** "${term}"\n\n`;
      response += result.definition;
      response += `\n\n⚠️ *Content from Urban Dictionary may contain explicit or offensive material*`;

      return response;
    } catch (error) {
      return `Error looking up Urban Dictionary: ${
        error instanceof Error ? error.message : 'Unknown error occurred'
      }`;
    }
  },
});
