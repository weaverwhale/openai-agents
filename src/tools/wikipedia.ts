import { z } from 'zod';
import { tool } from '@openai/agents';

// Define the parameter types to match the zod schema
type WikipediaParams = {
  query: string;
};

// Wikipedia lookup function
export const searchWikipedia = async (
  query: string,
): Promise<{ summary: string; url?: string; title?: string } | { error: string }> => {
  if (!query) {
    return { error: 'Query is required' };
  }

  try {
    const encodedQuery = encodeURIComponent(query.replace(/ /g, '_'));
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodedQuery}`;
    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 404) {
        return { error: `No Wikipedia page found for "${query}"` };
      }
      throw new Error(`Wikipedia API returned ${response.status}`);
    }

    const data = await response.json();

    if (!data.extract) {
      return { error: 'No summary found for this topic' };
    }

    return {
      summary: data.extract,
      url: data.content_urls?.desktop?.page,
      title: data.title,
    };
  } catch (error) {
    console.error('Error fetching from Wikipedia:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { error: `Could not fetch Wikipedia summary - ${errorMessage}` };
  }
};

// Wikipedia Tool
export const wikipediaTool = tool({
  name: 'wikipedia',
  description:
    'Get quick summaries and information from Wikipedia. Useful for looking up facts, definitions, historical information, and general knowledge topics.',
  parameters: z.object({
    query: z.string().describe('The topic to search on Wikipedia'),
  }),
  needsApproval: async (_ctx, { query }) => {
    // Generally Wikipedia content is safe, but we might want approval for certain topics
    const sensitiveTopics = ['controversial', 'political figure', 'war crimes', 'terrorism'];
    const isSensitive = sensitiveTopics.some((topic) =>
      query.toLowerCase().includes(topic.toLowerCase()),
    );

    return isSensitive; // Only require approval for potentially sensitive topics
  },
  execute: async ({ query }) => {
    try {
      if (!query || query.trim() === '') {
        throw new Error('Query cannot be empty');
      }

      const result = await searchWikipedia(query.trim());

      // Check if there was an error
      if ('error' in result) {
        throw new Error(result.error);
      }

      let response = `📚 **Wikipedia Summary**\n\n`;

      if (result.title) {
        response += `📖 **Title:** ${result.title}\n\n`;
      }

      response += `🔍 **Search Query:** "${query}"\n\n`;
      response += `📄 **Summary:**\n${result.summary}\n\n`;

      if (result.url) {
        response += `🔗 **Read More:** ${result.url}\n\n`;
      }

      response += `📝 *Source: Wikipedia*`;

      return response;
    } catch (error) {
      return `Error searching Wikipedia: ${
        error instanceof Error ? error.message : 'Unknown error occurred'
      }`;
    }
  },
});
