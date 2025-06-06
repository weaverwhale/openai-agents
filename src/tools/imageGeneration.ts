import { z } from 'zod';
import { tool } from '@openai/agents';
import { client } from '../openai';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Define the parameter types to match the zod schema
type GenerateImageParams = {
  prompt: string;
};

// Directory for storing generated images
const IMAGES_DIR = path.join(process.cwd(), 'uploads');

// Ensure the directory exists
if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

// Image generation function
export const generateImageFunction = async (prompt: string): Promise<{ image: string } | { error: string }> => {
  if (!prompt) {
    return { error: 'Prompt is required' };
  }

  try {
    const response = await client.images.generate({
      model: 'dall-e-3',
      prompt: prompt,
      n: 1,
      size: '1024x1024',
      response_format: 'b64_json',
    });

    if (!response.data || response.data.length === 0) {
      throw new Error('No image data received from OpenAI');
    }

    const imageData = response.data[0];
    if (!imageData?.b64_json) {
      throw new Error('No image data received from OpenAI');
    }

    // Generate a unique filename
    const filename = `${crypto.randomUUID()}.png`;
    const filepath = path.join(IMAGES_DIR, filename);

    // Convert base64 to buffer and save to file
    const buffer = Buffer.from(imageData.b64_json, 'base64');
    fs.writeFileSync(filepath, buffer);

    // Return the URL path to the image
    return { image: `/uploads/${filename}` };
  } catch (error) {
    console.error('Image generation error:', error);
    return { error: 'An error occurred while generating the image' };
  }
};

// Image Generation Tool
export const imageGenerationTool = tool({
  name: 'generate_image',
  description: 'Generate images based on text prompts using AI',
  parameters: z.object({
    prompt: z.string().describe('Prompt for the image generation'),
  }),
  needsApproval: async (_ctx, { prompt }) => {
    // Add approval logic for potentially inappropriate content
    const inappropriateTerms = ['nude', 'violence', 'explicit', 'nsfw'];
    return inappropriateTerms.some(term => 
      prompt.toLowerCase().includes(term.toLowerCase())
    );
  },
  execute: async ({ prompt }) => {
    try {
      if (!prompt || prompt.trim() === '') {
        throw new Error('Image generation prompt cannot be empty');
      }

      const result = await generateImageFunction(prompt.trim());
      
      // Check if there was an error
      if ('error' in result) {
        throw new Error(result.error);
      }
      
      let response = `🎨 **Image Generated Successfully!**\n\n`;
      response += `📝 **Prompt:** "${prompt}"\n`;
      response += `🖼️ **Image saved to:** ${result.image}\n`;
      response += `📁 **Full path:** ${path.resolve(IMAGES_DIR, path.basename(result.image))}\n\n`;
      response += `Your image has been generated and saved locally. You can find it in the uploads directory.`;
      
      return response;
    } catch (error) {
      return `Error generating image: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
    }
  },
}); 