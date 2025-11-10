#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import axios, { AxiosInstance } from 'axios';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import cors from 'cors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env file
dotenv.config({ path: join(__dirname, '..', '.env') });

// Load schemas
const imageSchema = JSON.parse(
  readFileSync(join(__dirname, '..', 'schemas', 'image-schema.json'), 'utf-8')
);
const videoSchema = JSON.parse(
  readFileSync(join(__dirname, '..', 'schemas', 'video-schema.json'), 'utf-8')
);

interface ServerConfig {
  apiUrl: string;
  port: number;
}

const config: ServerConfig = {
  apiUrl: process.env.JSONCUT_API_URL || 'https://api.jsoncut.com',
  port: parseInt(process.env.PORT || '3000', 10),
};

// Store API key per session
interface SessionData {
  apiKey: string;
}

class JsoncutMCPServer {
  public server: Server;
  private axiosInstance: AxiosInstance;
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.server = new Server(
      {
        name: 'jsoncut-mcp-server',
        version: '1.3.0',
      },
      {
        capabilities: {
          tools: {
            listChanged: false,
          },
          resources: {
            subscribe: false,
            listChanged: false,
          },
        },
      }
    );

    this.axiosInstance = axios.create({
      baseURL: config.apiUrl,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupToolHandlers();
    this.setupResourceHandlers();
    this.setupErrorHandling();
  }

  private getApiKey(providedKey?: string): string {
    const apiKey = providedKey || this.apiKey;
    if (!apiKey) {
      throw new Error(
        'API key is required. Provide X-API-Key header when connecting.'
      );
    }
    return apiKey;
  }

  private setupResourceHandlers(): void {
    // List available resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [
        {
          uri: 'schema://image',
          name: 'Image Generation Schema',
          description: 'Complete JSON schema for image generation configurations',
          mimeType: 'application/json',
        },
        {
          uri: 'schema://video',
          name: 'Video Generation Schema',
          description: 'Complete JSON schema for video generation configurations',
          mimeType: 'application/json',
        },
      ],
    }));

    // Read resource content
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;

      if (uri === 'schema://image') {
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(imageSchema, null, 2),
            },
          ],
        };
      }

      if (uri === 'schema://video') {
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(videoSchema, null, 2),
            },
          ],
        };
      }

      throw new Error(`Unknown resource: ${uri}`);
    });
  }

  private setupToolHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'create_image_config',
          description:
            'Create a JSON configuration for image generation. Returns a complete image config that can be sent to the Jsoncut API. Supports multiple layer types (image, text, rectangle, circle, gradient) with advanced positioning and styling options.',
          inputSchema: {
            type: 'object',
            properties: {
              width: {
                type: 'number',
                description: 'Canvas width in pixels',
              },
              height: {
                type: 'number',
                description: 'Canvas height in pixels',
              },
              background: {
                type: 'string',
                description: 'Background color (hex, rgb, or rgba)',
              },
              format: {
                type: 'string',
                enum: ['png', 'jpeg', 'webp'],
                description: 'Output format',
              },
              layers: {
                type: 'array',
                description: 'Array of layer objects defining the composition',
              },
            },
            required: ['width', 'height', 'layers'],
          },
        },
        {
          name: 'create_video_config',
          description:
            'Create a JSON configuration for video generation. Returns a complete video config that can be sent to the Jsoncut API. Supports clips, multiple layer types, transitions, and audio.',
          inputSchema: {
            type: 'object',
            properties: {
              width: {
                type: 'number',
                description: 'Video width in pixels',
              },
              height: {
                type: 'number',
                description: 'Video height in pixels',
              },
              fps: {
                type: 'number',
                description: 'Frames per second',
              },
              clips: {
                type: 'array',
                description: 'Array of video clips',
              },
            },
            required: ['width', 'height', 'clips'],
          },
        },
        {
          name: 'validate_config',
          description:
            'Validate an image or video configuration against the Jsoncut API. Returns validation status, estimated token cost, and any errors.',
          inputSchema: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                enum: ['image', 'video'],
                description: 'Type of configuration to validate',
              },
              config: {
                type: 'object',
                description: 'The configuration to validate',
              },
              apiKey: {
                type: 'string',
                description: 'Optional API key (uses environment variable if not provided)',
              },
            },
            required: ['type', 'config'],
          },
        },
        {
          name: 'get_image_schema',
          description:
            'Get the complete JSON schema for image generation. Note: This schema is also available as an MCP resource at schema://image',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'get_video_schema',
          description:
            'Get the complete JSON schema for video generation. Note: This schema is also available as an MCP resource at schema://video',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'create_image_config':
            return this.handleCreateImageConfig(args);
          case 'create_video_config':
            return this.handleCreateVideoConfig(args);
          case 'validate_config':
            return await this.handleValidateConfig(args);
          case 'get_image_schema':
            return this.handleGetImageSchema();
          case 'get_video_schema':
            return this.handleGetVideoSchema();
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error: any) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      console.error('[MCP Error]', error);
    };

    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private handleCreateImageConfig(args: any) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(args, null, 2),
        },
      ],
    };
  }

  private handleCreateVideoConfig(args: any) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(args, null, 2),
        },
      ],
    };
  }

  private async handleValidateConfig(args: any) {
    try {
      const { type, config, apiKey } = args;
      const key = this.getApiKey(apiKey);

      const endpoint = '/api/v1/jobs/validate';

      const response = await this.axiosInstance.post(
        endpoint,
        { type, config },
        {
          headers: {
            'X-API-Key': key,
          },
        }
      );

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(response.data, null, 2),
          },
        ],
      };
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || error.message || 'Validation failed';
      const errorDetails = error.response?.data?.errors
        ? JSON.stringify(error.response.data.errors, null, 2)
        : '';

      return {
        content: [
          {
            type: 'text',
            text: `Validation Error: ${errorMessage}\n${errorDetails}`,
          },
        ],
        isError: true,
      };
    }
  }

  private handleGetImageSchema() {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(imageSchema, null, 2),
        },
      ],
    };
  }

  private handleGetVideoSchema() {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(videoSchema, null, 2),
        },
      ],
    };
  }

}

// Start HTTP server
const app = express();

// CORS configuration
app.use(cors({
  origin: '*',
  exposedHeaders: ['Mcp-Session-Id']
}));
app.use(express.json());

// Map to store transports and servers by session ID
const sessions = new Map<string, { transport: StreamableHTTPServerTransport; server: JsoncutMCPServer }>();

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    version: '1.3.0',
    message: 'Public MCP server - send X-API-Key header with your requests'
  });
});

// Helper function to check if request is initialize
function isInitializeRequest(body: any): boolean {
  return body && body.method === 'initialize';
}

// MCP POST endpoint
app.post('/mcp', async (req: Request, res: Response) => {
  const sessionId = req.headers['mcp-session-id'] as string;
  const apiKey = req.headers['x-api-key'] as string;
  
  console.error(`MCP POST request - Session: ${sessionId || 'new'}, API Key: ${apiKey ? '[provided]' : '[missing]'}`);
  
  try {
    // Check for existing session
    if (sessionId && sessions.has(sessionId)) {
      const session = sessions.get(sessionId)!;
      await session.transport.handleRequest(req, res, req.body);
      return;
    }
    
    // New session - must be initialize request
    if (!isInitializeRequest(req.body)) {
      res.status(400).json({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Bad Request: No valid session ID provided or not an initialize request'
        },
        id: null
      });
      return;
    }
    
    // Check API key for new session
    if (!apiKey) {
      res.status(401).json({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Missing X-API-Key header'
        },
        id: null
      });
      return;
    }
    
    // Create new session
    const newSessionId = randomUUID();
    console.error(`Creating new session ${newSessionId}`);
    
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => newSessionId,
      onsessioninitialized: (sid) => {
        console.error(`Session initialized: ${sid}`);
      }
    });
    
    // Create server instance with user's API key
    const mcpServer = new JsoncutMCPServer(apiKey);
    
    // Store session
    sessions.set(newSessionId, { transport, server: mcpServer });
    
    // Set up close handler
    transport.onclose = () => {
      console.error(`Transport closed for session ${newSessionId}`);
      sessions.delete(newSessionId);
    };
    
    // Connect transport to server
    await mcpServer.server.connect(transport);
    
    // Handle the initialize request
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error('Error handling MCP POST:', error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal server error'
        },
        id: null
      });
    }
  }
});

// MCP GET endpoint - for SSE streams
app.get('/mcp', async (req: Request, res: Response) => {
  const sessionId = req.headers['mcp-session-id'] as string;
  
  if (!sessionId || !sessions.has(sessionId)) {
    res.status(400).send('Invalid or missing session ID');
    return;
  }
  
  console.error(`MCP GET request - Session: ${sessionId}`);
  
  const session = sessions.get(sessionId)!;
  await session.transport.handleRequest(req, res);
});

// MCP DELETE endpoint - for session termination
app.delete('/mcp', async (req: Request, res: Response) => {
  const sessionId = req.headers['mcp-session-id'] as string;
  
  if (!sessionId || !sessions.has(sessionId)) {
    res.status(400).send('Invalid or missing session ID');
    return;
  }
  
  console.error(`MCP DELETE request - Session: ${sessionId}`);
  
  const session = sessions.get(sessionId)!;
  await session.transport.handleRequest(req, res);
  sessions.delete(sessionId);
});

app.listen(config.port, () => {
  console.error(`Jsoncut MCP Server (Public) running on http://localhost:${config.port}`);
  console.error(`MCP endpoint: http://localhost:${config.port}/mcp`);
  console.error(`Health check: http://localhost:${config.port}/health`);
  console.error('');
  console.error('This is a PUBLIC server. Clients must provide their Jsoncut API key via X-API-Key header.');
  console.error('Get your API key at: https://jsoncut.com');
});
