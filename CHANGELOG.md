# Changelog

All notable changes to the Jsoncut MCP Server will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.3] - 2025-10-07

### Fixed
- Fixed `__dirname` conflict in CommonJS by removing manual declaration (CommonJS provides it automatically)
- Corrected schema file paths to work with CommonJS module system

## [1.0.2] - 2025-10-07

### Fixed
- Added explicit `"type": "commonjs"` to package.json to fix ES module scope error
- Ensures proper CommonJS execution when using npx

## [1.0.1] - 2025-10-06

### Fixed
- Fixed npm package bin entry to work correctly with npx
- Changed from ES modules to CommonJS for better compatibility
- Fixed import.meta usage for CommonJS compatibility

## [1.0.0] - 2025-10-06

### 🎉 Initial Release

The first public release of the Jsoncut MCP Server - a Model Context Protocol server that enables AI agents and LLMs to generate stunning images and videos using the Jsoncut API.

### Features

#### Core Functionality
- **Image Generation**: Create JSON configurations for image composition jobs
  - Support for 5 layer types: image, text, rectangle, circle, gradient
  - Advanced positioning system (pixel coordinates, position strings, position objects)
  - Visual effects: opacity, rotation, blur, borderRadius
  - Output formats: PNG, JPEG, WebP
  - Defaults system for consistent layer properties
  - Support for up to 50 layers per image

- **Video Generation**: Create JSON configurations for video rendering jobs
  - Clip-based system with sequential playback
  - Comprehensive layer types: video, image, image-overlay, title, subtitle, news-title, title-background, slide-in-text, audio, detached-audio, gradients, pause
  - 75+ transition effects (fade, wipe, circle, cube, glitch, zoom, etc.)
  - Advanced audio system:
    - Background audio with looping
    - Multiple audio tracks with independent timing
    - Audio normalization with ducking
    - Clip audio control
  - Ken Burns effects for video and image layers
  - Defaults system for clips and layers

#### MCP Integration
- **MCP Resources**: JSON schemas available as resources for direct access
  - `schema://image` - Image generation schema
  - `schema://video` - Video generation schema
  - No tool calls needed for schema access

- **Validation Tool**: Pre-submission validation
  - Schema compliance checking
  - Resource availability verification
  - Estimated token cost calculation
  - Detailed error reporting

#### Tools
- `create_image_config` - Generate image job configurations
- `create_video_config` - Generate video job configurations
- `validate_config` - Validate configurations against the API
- `get_image_schema` - Retrieve complete image schema
- `get_video_schema` - Retrieve complete video schema

#### Authentication
- Flexible API key authentication:
  - Environment variable (`JSONCUT_API_KEY`)
  - `.env` file support
  - Per-request API key parameter

#### Documentation
- Comprehensive README with usage examples
- Complete JSON schemas for image and video generation
- Example configurations in `examples/` directory
- Inline tool descriptions for LLM guidance
- Recommended workflow documentation

#### Developer Experience
- TypeScript support with full type definitions
- MCP Inspector integration for interactive testing
- Watch mode for development
- Support for Node.js >= 18.0.0

### Client Support
- **Cursor IDE**: Full integration with configuration examples
- **Claude Desktop**: Ready-to-use configuration
- **npx**: Direct execution without installation

### Package
- Published on npm as `@jsoncut/mcp-server`
- Binary command: `jsoncut-mcp`
- Includes dist files, schemas, and examples

---

## Links

- [GitHub Repository](https://github.com/jsoncut/jsoncut-mcp-server)
- [npm Package](https://www.npmjs.com/package/@jsoncut/mcp-server)
- [API Documentation](https://docs.jsoncut.com)
- [Jsoncut Website](https://jsoncut.com)
