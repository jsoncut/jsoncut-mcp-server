#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import axios, { AxiosInstance } from 'axios';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import dotenv from 'dotenv';

// In CommonJS, __dirname is already defined as the directory of the current module
// Load environment variables from .env file
dotenv.config({ path: join(__dirname, '.env') });

// Load schemas (in CommonJS __dirname points to dist/, so we go up one level)
const imageSchema = JSON.parse(
  readFileSync(join(__dirname, '..', 'schemas', 'image-schema.json'), 'utf-8')
);
const videoSchema = JSON.parse(
  readFileSync(join(__dirname, '..', 'schemas', 'video-schema.json'), 'utf-8')
);

interface ServerConfig {
  apiKey: string | null;
  apiUrl: string;
}

const config: ServerConfig = {
  apiKey: process.env.JSONCUT_API_KEY || null,
  apiUrl: 'https://api.jsoncut.com',
};

class JsoncutMCPServer {
  private server: Server;
  private axiosInstance: AxiosInstance;

  constructor() {
    this.server = new Server(
      {
        name: 'jsoncut-mcp-server',
        version: '1.0.2',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
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
    const apiKey = providedKey || config.apiKey;
    if (!apiKey) {
      throw new Error(
        'API key is required. Set JSONCUT_API_KEY environment variable or provide apiKey parameter.'
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

      switch (uri) {
        case 'schema://image':
          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify(imageSchema, null, 2),
              },
            ],
          };

        case 'schema://video':
          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify(videoSchema, null, 2),
              },
            ],
          };

        default:
          throw new Error(`Unknown resource: ${uri}`);
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

  private setupToolHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'create_image_config',
          description: `Create a JSON configuration for image generation based on jsoncut documentation.
          
Returns a complete configuration object that can be used with the validate_config tool or submitted directly to the jsoncut API.

**WORKFLOW:** 
1. First get the schema (read resource schema://image or call get_image_schema) to understand all available options
2. Create the configuration with this tool
3. Call validate_config to verify the configuration (if user provided media file paths)

**Image Structure:**
- Layer-based system (rendered bottom to top, max 50 layers)
- Canvas with dimensions, background color, and output format
- Support for defaults to avoid repetition

**Layer Types:**
- image: Display uploaded images with fit modes (cover, contain, fill, inside, outside)
- text: Text with custom fonts, alignment, wrapping, and effects
- rectangle: Rectangular shapes with fill, stroke, and rounded corners
- circle: Circular and elliptical shapes
- gradient: Linear or radial color gradients

**Positioning Options:**
- x, y coordinates (pixels from top-left)
- position strings: center, top, bottom, top-left, top-right, center-left, center-right, bottom-left, bottom-right
- position objects: { x: 0-1, y: 0-1, originX: left|center|right, originY: top|center|bottom }

**Visual Effects:**
- opacity: 0-1 transparency
- rotation: degrees
- blur: pixel radius
- borderRadius: rounded corners (image, rectangle)

**Text Features:**
- Custom fonts via fontPath
- Text wrapping with width and lineHeight
- Alignment: left, center, right
- backgroundColor (single line only)

**Output Formats:**
- png: Lossless with transparency (default)
- jpeg: Lossy compression (use quality parameter)
- webp: Modern format with transparency and compression

**Defaults System:**
- defaults.layer: Properties for all layers
- defaults.layerType.{type}: Properties for specific layer types

File paths should be placeholders like "/image/2024-01-15/userXXX/filename.ext" or "/font/2024-01-15/userXXX/font.ttf".`,
          inputSchema: {
            type: 'object',
            properties: {
              width: {
                type: 'number',
                description: 'Canvas width in pixels (max 4096px)',
                default: 1920,
              },
              height: {
                type: 'number',
                description: 'Canvas height in pixels (max 4096px)',
                default: 1080,
              },
              backgroundColor: {
                type: 'string',
                description: 'Background color (hex, rgb, or named). Default: transparent',
              },
              format: {
                type: 'string',
                description: 'Output format: png (default, transparent), jpeg (compressed), webp (modern)',
                enum: ['png', 'jpeg', 'webp'],
                default: 'png',
              },
              quality: {
                type: 'number',
                description: 'Quality for JPEG/WebP (1-100, default: 90)',
                default: 90,
              },
              defaults: {
                type: 'object',
                description: 'Default properties for layers',
                properties: {
                  layer: {
                    type: 'object',
                    description: 'Properties applied to all layers',
                  },
                  layerType: {
                    type: 'object',
                    description: 'Properties per layer type (text, image, rectangle, circle, gradient)',
                  },
                },
              },
              layers: {
                type: 'array',
                description: `Array of layer objects (max 50). Layer types:
- image: { type: "image", path, x/y/position, width, height, fit, opacity, rotation, blur, borderRadius }
- text: { type: "text", text, x/y/position, fontSize, fontPath, color, align, wrap, width, lineHeight, backgroundColor, opacity, rotation, blur }
- rectangle: { type: "rectangle", x, y, width, height, fill, stroke, strokeWidth, opacity, rotation, blur, borderRadius }
- circle: { type: "circle", x, y, width, height, fill, stroke, strokeWidth, opacity, blur }
- gradient: { type: "gradient", x, y, width, height, gradient: { type: linear/radial, colors: [], direction: horizontal/vertical/diagonal }, opacity, rotation, blur }`,
                items: {
                  type: 'object',
                },
              },
            },
            required: ['layers'],
          },
        },
        {
          name: 'create_video_config',
          description: `Create a JSON configuration for video generation based on jsoncut documentation.
          
Returns a complete configuration object that can be used with the validate_config tool or submitted directly to the jsoncut API.

**WORKFLOW:** 
1. First get the schema (read resource schema://video or call get_video_schema) to understand all available options
2. Create the configuration with this tool
3. Call validate_config to verify the configuration (if user provided media file paths)

**Video Structure:**
- Built using clips (segments) that play sequentially
- Each clip contains layers (rendered bottom to top)
- Supports transitions between clips
- Comprehensive audio system with multiple options

**Layer Types:**
- video: Display video files with timing control and Ken Burns effects
- image: Static images with positioning and Ken Burns effects
- image-overlay: Images positioned over other content with timing
- title: Large headline text with custom fonts
- subtitle: Smaller text for captions
- news-title: Breaking news style with colored backgrounds
- title-background: Titles with full-screen backgrounds
- slide-in-text: Animated text that slides in
- audio: Audio tracks tied to clips (requires keepSourceAudio: true)
- detached-audio: Audio with clip-relative timing
- fill-color: Solid color backgrounds
- linear-gradient: Linear gradient backgrounds
- radial-gradient: Radial gradient backgrounds
- rainbow-colors: Animated rainbow effects
- pause: Black screen pauses

**Audio Options:**
- audioFilePath + loopAudio: Background music throughout video
- audioTracks: Multiple audio tracks with independent timing
- audioNorm: Audio normalization with ducking
- keepSourceAudio: Keep audio from video layers
- Audio layers within clips

**Transitions:** 75+ transition effects including fade, wipe, circle, cube, glitch, zoom, etc.

File paths should be placeholders like "/input/userXXX/filename.ext".`,
          inputSchema: {
            type: 'object',
            properties: {
              width: {
                type: 'number',
                description: 'Width in pixels (default: 1280)',
                default: 1280,
              },
              height: {
                type: 'number',
                description: 'Height in pixels (default: 720)',
                default: 720,
              },
              fps: {
                type: 'number',
                description: 'Frames per second (24, 25, 30, 50, 60, 120)',
                default: 25,
                enum: [24, 25, 30, 50, 60, 120]
              },
              format: {
                type: 'string',
                description: 'Output format: mp4 or mov',
                enum: ['mp4', 'mov'],
                default: 'mp4',
              },
              fast: {
                type: 'boolean',
                description: 'Enable fast processing mode (for preview)',
                default: false
              },
              audioFilePath: {
                type: 'string',
                description: 'Path to background audio file (plays throughout video)',
              },
              loopAudio: {
                type: 'boolean',
                description: 'Loop background audio if shorter than video',
                default: false
              },
              outputVolume: {
                type: 'number',
                description: 'Final output volume (0-1)',
                default: 1
              },
              keepSourceAudio: {
                type: 'boolean',
                description: 'Keep audio from video layers (required for audio layers)',
                default: false
              },
              clipsAudioVolume: {
                type: 'number',
                description: 'Volume for audio from clips relative to tracks (0-1)',
                default: 1
              },
              audioTracks: {
                type: 'array',
                description: 'Multiple audio tracks with independent timing',
                items: {
                  type: 'object',
                  properties: {
                    path: { type: 'string', description: 'Audio file path' },
                    mixVolume: { type: 'number', description: 'Relative volume (0-1)', default: 1 },
                    start: { type: 'number', description: 'Start time in video (seconds)', default: 0 },
                    cutFrom: { type: 'number', description: 'Cut from in audio file (seconds)', default: 0 },
                    cutTo: { type: 'number', description: 'Cut to in audio file (seconds)' }
                  }
                },
              },
              audioNorm: {
                type: 'object',
                description: 'Audio normalization with ducking',
                properties: {
                  enable: { type: 'boolean', default: false },
                  gaussSize: { type: 'number', description: 'Gaussian filter size (1-10)', default: 5 },
                  maxGain: { type: 'number', description: 'Max gain in dB', default: 30 }
                }
              },
              defaults: {
                type: 'object',
                description: 'Default properties for clips and layers',
                properties: {
                  duration: { type: 'number', description: 'Default clip duration' },
                  transition: { type: 'object', description: 'Default transition' },
                  layer: { type: 'object', description: 'Default layer properties' },
                  layerType: { type: 'object', description: 'Defaults per layer type' }
                }
              },
              clips: {
                type: 'array',
                description: 'Array of clip objects. Each clip has layers and optional duration/transition.',
                items: {
                  type: 'object',
                  properties: {
                    duration: { type: 'number', description: 'Clip duration in seconds' },
                    layers: { type: 'array', description: 'Array of layer objects' },
                    transition: { 
                      type: 'object', 
                      description: 'Transition to next clip',
                      properties: {
                        name: { type: 'string', description: 'Transition name (fade, wipe, etc.)' },
                        duration: { type: 'number', description: 'Transition duration in seconds' }
                      }
                    }
                  }
                },
              },
            },
            required: ['clips'],
          },
        },
        {
          name: 'validate_config',
          description: `Validate a job configuration against the jsoncut API.
          
This tool sends the configuration to the API's validation endpoint to check:
- Schema compliance
- Resource availability
- Estimated token cost
- Any configuration errors

**WHEN TO USE:**
- ONLY call this tool if the user has provided actual media file paths (e.g., from uploaded files)
- DO NOT validate configurations with placeholder paths like "/image/2024-01-15/userXXX/..."
- Always call this after creating a configuration when real file paths are available

**BENEFITS:**
- Catches errors before job submission
- Provides accurate token cost estimates
- Verifies that referenced files exist and are accessible`,
          inputSchema: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                description: 'Job type: image or video',
                enum: ['image', 'video'],
              },
              config: {
                type: 'object',
                description: 'The configuration object to validate (from create_image_config or create_video_config)',
              },
              apiKey: {
                type: 'string',
                description: 'API key (optional if JSONCUT_API_KEY env var is set)',
              },
            },
            required: ['type', 'config'],
          },
        },
        {
          name: 'get_image_schema',
          description: `Get the complete JSON schema for image generation.
          
Returns the full JSON Schema document that defines all possible configuration options for image generation jobs. Use this to understand all available options, constraints, and examples.

**NOTE:** This schema is also available as a resource at schema://image which can be read directly without a tool call.

**IMPORTANT: Get this schema FIRST when creating image configurations** to understand the complete structure, available layer types, positioning options, and all properties. This ensures you create valid and complete configurations.`,
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'get_video_schema',
          description: `Get the complete JSON schema for video generation.
          
Returns the full JSON Schema document that defines all possible configuration options for video generation jobs. Use this to understand all available options, constraints, and examples.

**NOTE:** This schema is also available as a resource at schema://video which can be read directly without a tool call.

**IMPORTANT: Get this schema FIRST when creating video configurations** to understand the complete structure, available layer types, audio options, transitions, and all properties. This ensures you create valid and complete configurations.`,
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
      ],
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'create_image_config':
            return await this.handleCreateImageConfig(args);

          case 'create_video_config':
            return await this.handleCreateVideoConfig(args);

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

  private async handleCreateImageConfig(args: any) {
    const config: any = {
      width: args.width || 1920,
      height: args.height || 1080,
      layers: args.layers || [],
    };

    // Optional properties
    if (args.backgroundColor !== undefined) {
      config.backgroundColor = args.backgroundColor;
    }

    if (args.format !== undefined) {
      config.format = args.format;
    }

    if (args.quality !== undefined) {
      config.quality = args.quality;
    }

    // Defaults system
    if (args.defaults !== undefined) {
      config.defaults = args.defaults;
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              type: 'image',
              config,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async handleCreateVideoConfig(args: any) {
    const config: any = {
      width: args.width || 1280,
      height: args.height || 720,
      fps: args.fps || 25,
      format: args.format || 'mp4',
      clips: args.clips || [],
    };

    // Optional properties
    if (args.fast !== undefined) {
      config.fast = args.fast;
    }

    // Background audio
    if (args.audioFilePath) {
      config.audioFilePath = args.audioFilePath;
    }
    if (args.loopAudio !== undefined) {
      config.loopAudio = args.loopAudio;
    }
    if (args.outputVolume !== undefined) {
      config.outputVolume = args.outputVolume;
    }
    if (args.keepSourceAudio !== undefined) {
      config.keepSourceAudio = args.keepSourceAudio;
    }
    if (args.clipsAudioVolume !== undefined) {
      config.clipsAudioVolume = args.clipsAudioVolume;
    }

    // Audio tracks
    if (args.audioTracks && args.audioTracks.length > 0) {
      config.audioTracks = args.audioTracks;
    }

    // Audio normalization
    if (args.audioNorm) {
      config.audioNorm = args.audioNorm;
    }

    // Defaults
    if (args.defaults) {
      config.defaults = args.defaults;
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              type: 'video',
              config,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async handleValidateConfig(args: any) {
    try {
      const { type, config, apiKey } = args;
      
      // Validate required parameters
      if (!type) {
        throw new Error('Missing required parameter: type');
      }
      if (!config) {
        throw new Error('Missing required parameter: config');
      }

      // Parse config if it's a string
      let parsedConfig = config;
      if (typeof config === 'string') {
        try {
          parsedConfig = JSON.parse(config);
        } catch (e) {
          throw new Error('Invalid config JSON string');
        }
      }

      const key = this.getApiKey(apiKey);

      const response = await this.axiosInstance.post(
        '/api/v1/jobs/validate',
        {
          type,
          config: parsedConfig,
        },
        {
          headers: {
            'x-api-key': key,
          },
        }
      );

      const result = response.data;
      
      if (result.success && result.data) {
        const validation = result.data;
        let message = `Validation Result:\n`;
        message += `- Valid: ${validation.isValid ? '✅ Yes' : '❌ No'}\n`;
        
        if (validation.estimatedTokens !== undefined) {
          message += `- Estimated Tokens: ${validation.estimatedTokens}\n`;
        }

        if (validation.errors && validation.errors.length > 0) {
          message += `\nErrors:\n`;
          validation.errors.forEach((err: any, idx: number) => {
            message += `  ${idx + 1}. ${err.message}`;
            if (err.field) {
              message += ` (field: ${err.field})`;
            }
            message += '\n';
          });
        }

        if (validation.detectedResources && validation.detectedResources.length > 0) {
          message += `\nDetected Resources:\n`;
          validation.detectedResources.forEach((res: any) => {
            message += `  - ${res.type}: ${res.url}`;
            if (res.size) {
              message += ` (${(res.size / 1024 / 1024).toFixed(2)} MB)`;
            }
            message += '\n';
          });
        }

        return {
          content: [
            {
              type: 'text',
              text: message,
            },
          ],
        };
      } else {
        const errorMessage = result.error || 'Validation failed';
        return {
          content: [
            {
              type: 'text',
              text: `Validation Error: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    } catch (error: any) {
      let errorMessage = 'Unknown error occurred';
      
      if (error.response) {
        const errorData = error.response.data;
        errorMessage = errorData.error || errorData.message || `API Error: ${error.response.status} ${error.response.statusText}`;
        
        if (errorData.details) {
          errorMessage += `\nDetails: ${JSON.stringify(errorData.details, null, 2)}`;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      return {
        content: [
          {
            type: 'text',
            text: `Validation Error: ${errorMessage}`,
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

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Jsoncut MCP Server running on stdio');
  }
}

// Start server
const server = new JsoncutMCPServer();
server.run().catch(console.error);

