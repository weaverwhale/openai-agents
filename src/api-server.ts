import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { Agent, run } from '@openai/agents';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { allTools } from './tools';
import { generateMegaAgentPrompt } from './prompt';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
});

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// Serve static files
app.use(express.static('public'));

// In-memory conversation storage (replace with database in production)
interface Conversation {
  id: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    toolCalls?: Array<{
      name: string;
      args: any;
      result?: any;
    }>;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const conversations = new Map<string, Conversation>();

// Create agent instance
const agent = new Agent({
  name: 'Mega Agent API',
  instructions: generateMegaAgentPrompt,
  tools: allTools,
});

// Utility function to generate conversation ID
function generateConversationId(): string {
  return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Get or create conversation
function getOrCreateConversation(conversationId?: string): Conversation {
  if (conversationId && conversations.has(conversationId)) {
    return conversations.get(conversationId)!;
  }

  const newConversation: Conversation = {
    id: conversationId || generateConversationId(),
    messages: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  conversations.set(newConversation.id, newConversation);
  return newConversation;
}

// API Routes

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0',
  });
});

// Get conversation history
app.get('/conversations/:id?', (req, res) => {
  const conversationId = req.params.id;

  if (conversationId) {
    const conversation = conversations.get(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    res.json(conversation);
  } else {
    // Return all conversations (metadata only)
    const conversationList = Array.from(conversations.values()).map((conv) => ({
      id: conv.id,
      messageCount: conv.messages.length,
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
      lastMessage: conv.messages[conv.messages.length - 1]?.content.substring(0, 100) + '...',
    }));
    res.json(conversationList);
  }
});

// Delete conversation
app.delete('/conversations/:id', (req, res) => {
  const conversationId = req.params.id;
  if (conversations.has(conversationId)) {
    conversations.delete(conversationId);
    res.json({ message: 'Conversation deleted successfully' });
  } else {
    res.status(404).json({ error: 'Conversation not found' });
  }
});

// Chat endpoint with streaming support
app.post('/chat', async (req, res) => {
  try {
    const { message, conversationId, stream = false } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required and must be a string' });
    }

    const conversation = getOrCreateConversation(conversationId);

    // Add user message to conversation
    conversation.messages.push({
      role: 'user',
      content: message,
      timestamp: new Date(),
    });
    conversation.updatedAt = new Date();

    if (stream) {
      // Set up Server-Sent Events
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
      });

      let assistantMessage = '';
      const toolCalls: Array<{ name: string; args: any; result?: any }> = [];

      try {
        // Convert conversation to agent input format
        const agentInputItems = conversation.messages
          .filter((msg) => msg.role === 'user')
          .map((msg) => ({
            role: 'user' as const,
            content: msg.content,
            type: 'message' as const,
          }));

        // Add current message
        agentInputItems.push({
          role: 'user' as const,
          content: message,
          type: 'message' as const,
        });

        const stream = await run(agent, agentInputItems, { stream: true });

        // Send conversation ID
        res.write(
          `data: ${JSON.stringify({
            type: 'conversation_id',
            conversationId: conversation.id,
          })}\n\n`,
        );

        for await (const event of stream) {
          // Handle text output
          if (
            event.type === 'raw_model_stream_event' &&
            event.data?.type === 'output_text_delta' &&
            event.data?.delta
          ) {
            const textChunk = event.data.delta;
            assistantMessage += textChunk;

            res.write(
              `data: ${JSON.stringify({
                type: 'text_delta',
                delta: textChunk,
              })}\n\n`,
            );
          }

          // Handle tool calls
          else if (
            event.type === 'run_item_stream_event' &&
            event.item?.type === 'tool_call_item'
          ) {
            // Handle different tool types
            let toolName = 'unknown_tool';
            let toolArgs = {};

            if (event.item.rawItem) {
              // Handle regular function calls
              if ('name' in event.item.rawItem && event.item.rawItem.name) {
                toolName = event.item.rawItem.name;
              }

              // Handle function arguments
              if ('arguments' in event.item.rawItem && event.item.rawItem.arguments) {
                try {
                  toolArgs = JSON.parse(event.item.rawItem.arguments);
                } catch (error) {
                  toolArgs = { arguments: event.item.rawItem.arguments };
                }
              }

              // Handle computer calls
              if ('action' in event.item.rawItem && event.item.rawItem.action) {
                toolName = `computer_${event.item.rawItem.action.type}`;
                toolArgs = event.item.rawItem.action;
              }
            }

            const toolCall = { name: toolName, args: toolArgs };
            toolCalls.push(toolCall);

            res.write(
              `data: ${JSON.stringify({
                type: 'tool_call',
                toolName,
                args: toolArgs,
              })}\n\n`,
            );
          }

          // Handle tool results
          else if (
            event.type === 'run_item_stream_event' &&
            event.item?.type === 'tool_call_output_item'
          ) {
            const result = event.item.rawItem?.output || 'No result';

            // Update the last tool call with the result
            if (toolCalls.length > 0) {
              toolCalls[toolCalls.length - 1].result = result;
            }

            res.write(
              `data: ${JSON.stringify({
                type: 'tool_result',
                result,
              })}\n\n`,
            );
          }
        }

        // Add assistant message to conversation
        conversation.messages.push({
          role: 'assistant',
          content: assistantMessage,
          timestamp: new Date(),
          toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        });
        conversation.updatedAt = new Date();

        // Send completion event
        res.write(
          `data: ${JSON.stringify({
            type: 'complete',
            message: assistantMessage,
            toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
          })}\n\n`,
        );
      } catch (error) {
        console.error('Streaming error:', error);
        res.write(
          `data: ${JSON.stringify({
            type: 'error',
            error: error instanceof Error ? error.message : 'Unknown error occurred',
          })}\n\n`,
        );
      }

      res.end();
    } else {
      // Non-streaming response
      let assistantMessage = '';
      const toolCalls: Array<{ name: string; args: any; result?: any }> = [];

      try {
        // Convert conversation to agent input format
        const agentInputItems = conversation.messages
          .filter((msg) => msg.role === 'user')
          .map((msg) => ({
            role: 'user' as const,
            content: msg.content,
            type: 'message' as const,
          }));

        // Add current message
        agentInputItems.push({
          role: 'user' as const,
          content: message,
          type: 'message' as const,
        });

        const stream = await run(agent, agentInputItems, { stream: true });

        for await (const event of stream) {
          // Handle text output
          if (
            event.type === 'raw_model_stream_event' &&
            event.data?.type === 'output_text_delta' &&
            event.data?.delta
          ) {
            assistantMessage += event.data.delta;
          }

          // Handle tool calls and results
          else if (event.type === 'run_item_stream_event') {
            if (event.item?.type === 'tool_call_item') {
              // Handle different tool types
              let toolName = 'unknown_tool';
              let toolArgs = {};

              if (event.item.rawItem) {
                // Handle regular function calls
                if ('name' in event.item.rawItem && event.item.rawItem.name) {
                  toolName = event.item.rawItem.name;
                }

                // Handle function arguments
                if ('arguments' in event.item.rawItem && event.item.rawItem.arguments) {
                  try {
                    toolArgs = JSON.parse(event.item.rawItem.arguments);
                  } catch (error) {
                    toolArgs = { arguments: event.item.rawItem.arguments };
                  }
                }

                // Handle computer calls
                if ('action' in event.item.rawItem && event.item.rawItem.action) {
                  toolName = `computer_${event.item.rawItem.action.type}`;
                  toolArgs = event.item.rawItem.action;
                }
              }

              toolCalls.push({ name: toolName, args: toolArgs });
            } else if (event.item?.type === 'tool_call_output_item') {
              const result = event.item.rawItem?.output || 'No result';
              if (toolCalls.length > 0) {
                toolCalls[toolCalls.length - 1].result = result;
              }
            }
          }
        }

        // Add assistant message to conversation
        conversation.messages.push({
          role: 'assistant',
          content: assistantMessage,
          timestamp: new Date(),
          toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        });
        conversation.updatedAt = new Date();

        res.json({
          conversationId: conversation.id,
          message: assistantMessage,
          toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({
          error: error instanceof Error ? error.message : 'Unknown error occurred',
        });
      }
    }
  } catch (error) {
    console.error('Request error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    });
  }
});

// File upload endpoint
app.post('/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileInfo = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      path: req.file.path,
      url: `/uploads/${req.file.filename}`,
    };

    res.json({
      message: 'File uploaded successfully',
      file: fileInfo,
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Upload failed',
    });
  }
});

// List available tools
app.get('/tools', (req, res) => {
  const toolInfo = allTools.map((tool: any) => ({
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters?._def?.shape ? Object.keys(tool.parameters._def.shape) : [],
  }));

  res.json({ tools: toolInfo });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err instanceof Error ? err.message : 'Unknown error',
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 OpenAI Agents API Server running on http://localhost:${PORT}`);
  console.log(`📚 Available endpoints:`);
  console.log(`   GET  /health - Health check`);
  console.log(`   GET  /conversations - List all conversations`);
  console.log(`   GET  /conversations/:id - Get specific conversation`);
  console.log(`   DELETE /conversations/:id - Delete conversation`);
  console.log(`   POST /chat - Send message (supports streaming)`);
  console.log(`   POST /upload - Upload files`);
  console.log(`   GET  /tools - List available tools`);
  console.log(`   GET  /uploads/:filename - Access uploaded files`);
  console.log(`💡 Use stream: true in /chat request for streaming responses`);
});

export default app;
