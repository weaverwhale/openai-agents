import { z } from 'zod';
import { tool } from '@openai/agents';
import { client, model } from '../openai';
import { generateWebSearchPrompt } from '../prompt';
import { SearchResponse, SearchSource } from './types';

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
    return sensitiveTerms.some((term) => query.toLowerCase().includes(term.toLowerCase()));
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
      return `Error performing search: ${
        error instanceof Error ? error.message : 'Unknown error occurred'
      }`;
    }
  },
});
