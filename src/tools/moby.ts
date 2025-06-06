import { z } from 'zod';
import { tool } from '@openai/agents';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

const MOBY_TLD = 'http://willy.srv.whale3.io';
const MOBY_ENDPOINT = `${MOBY_TLD}/answer-nlq-question`;

// Generate a UUID using Node.js crypto
function generateUUID(): string {
  return crypto.randomUUID();
}

// Define the parameter types to match the zod schema
type MobyParams = {
  question: string;
  shopId: string;
};

// Moby query function
export const queryMoby = async (
  question: string,
  shopId: string,
  parentMessageId?: string | null,
): Promise<{ answer: string } | { error: string }> => {
  if (!question) {
    return { error: 'Question is required' };
  }

  try {
    console.log('[API] Executing moby tool with params:', question, shopId);

    const response = await fetch(MOBY_ENDPOINT, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        stream: false,
        shopId: shopId || 'madisonbraids.myshopify.com',
        conversationId: (parentMessageId || generateUUID()).toString(),
        source: 'chat',
        dialect: 'clickhouse',
        userId: 'test-user',
        additionalShopIds: [],
        question: question,
        query: question,
        generateInsights: true,
        isOutsideMainChat: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();
    const lastMessageText = data.messages?.[data.messages.length - 1]?.text;

    if (!lastMessageText) {
      return { error: 'No answer received from Moby' };
    }

    return { answer: lastMessageText.trim() };
  } catch (error) {
    console.error('Error querying Moby:', error);
    return { error: 'Could not fetch response from Triple Whale' };
  }
};

// Moby Tool
export const mobyTool = tool({
  name: 'moby',
  description:
    "Get e-commerce analytics and insights from Triple Whale's AI, Moby. Useful for Shopify store analytics, sales data, customer insights, and business metrics.",
  parameters: z.object({
    question: z
      .string()
      .describe('Question to ask Triple Whale Moby about e-commerce analytics')
      .default('What is triple whale?'),
    shopId: z.string().describe('Shopify store URL').default('madisonbraids.myshopify.com'),
  }),
  needsApproval: async (_ctx, { question, shopId }) => {
    // Add approval logic for sensitive business queries
    const sensitiveTerms = ['financial data', 'customer emails', 'private information', 'api keys'];
    const isSensitive = sensitiveTerms.some((term) =>
      question.toLowerCase().includes(term.toLowerCase()),
    );

    // Also require approval for non-default shop IDs
    const isNonDefaultShop = shopId !== 'madisonbraids.myshopify.com';

    return Boolean(isSensitive || isNonDefaultShop);
  },
  execute: async ({ question, shopId }) => {
    try {
      if (!question || question.trim() === '') {
        throw new Error('Question cannot be empty');
      }

      // Always generate a new UUID for conversation context
      const parentMessageId = generateUUID();
      const result = await queryMoby(question.trim(), shopId, parentMessageId);

      // Check if there was an error
      if ('error' in result) {
        throw new Error(result.error);
      }

      let response = `🐋 **Triple Whale Moby Analytics**\n\n`;
      response += `❓ **Question:** "${question}"\n`;
      if (shopId !== 'madisonbraids.myshopify.com') {
        response += `🏪 **Shop ID:** ${shopId}\n`;
      }
      response += `\n📊 **Moby's Response:**\n${result.answer}\n\n`;
      response += `💡 *Powered by Triple Whale's AI Analytics*`;

      return response;
    } catch (error) {
      return `Error querying Moby: ${
        error instanceof Error ? error.message : 'Unknown error occurred'
      }`;
    }
  },
});
