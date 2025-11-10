# Changelog

All notable changes to the Jsoncut MCP Server will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.0] - 2025-11-10

### Added
- **Docker Support**: Full Docker deployment support with multi-stage builds
  - Docker image: `centerbit/jsoncut-mcp-server`
  - HTTP server with StreamableHTTPServerTransport for remote MCP access
  - Session management with per-user API key authentication
  - Health check endpoint at `/health`
  - Docker Compose configuration for easy local deployment
  - Automated Docker publishing script with version extraction from CHANGELOG
- **Public URL Support**: Schemas now accept public URLs with file extensions
  - Image paths: Support for `https://` URLs with `.jpg`, `.png`, `.webp` extensions
  - Video paths: Support for `https://` URLs with `.mp4`, `.mov` extensions
  - Audio paths: Support for `https://` URLs with `.mp3`, `.wav` extensions
  - Font paths: Support for `https://` URLs with `.ttf`, `.otf` extensions
  - Picsum placeholder support: `https://picsum.photos/800/600.jpg` for testing
- **HTTP Transport**: Modern StreamableHTTPServerTransport implementation
  - POST endpoint for client requests
  - GET endpoint for SSE streams
  - DELETE endpoint for session termination
  - Multi-user support with isolated sessions
  - X-API-Key header authentication per request

### Changed
- **Validation Endpoint**: Fixed to use correct API path `/api/v1/jobs/validate`
- **Schema Descriptions**: Updated all path descriptions to include public URL examples
- **Transport Layer**: StreamableHTTPServerTransport

### Technical Details
- Docker image uses Node.js 22 Alpine for minimal size
- Multi-stage build separates build and runtime dependencies
- Session-based architecture allows multiple concurrent users
- Compatible with MCP protocol version 2025-06-18
- Supports both stdio (npx) and HTTP (Docker) transports

## [1.2.0] - 2025-01-19

### Added
- **Title Layer Animation Styles**: New `style` property for title layers with three animation effects:
  - `"fade-in"` - Smooth fade-in effect (default for title layers)
  - `"word-by-word"` - Words appear sequentially in title layers
  - `"letter-by-letter"` - Letters appear sequentially in title layers
- **Enhanced Video Layer Positioning**: Video layers now support both position objects and position strings:
  - Position objects: `{ x: 0-1, y: 0-1, originX: left|center|right, originY: top|center|bottom }`
  - Position strings: `center`, `top`, `bottom`, `top-left`, `top-right`, `center-left`, `center-right`, `bottom-left`, `bottom-right`
- **Enhanced Title Layer Positioning**: Title layers now support position objects with precise control:
  - Same position object format as video layers
  - Backward compatible with existing position strings
- **Smart Zoom Deactivation**: Zoom effects are automatically disabled for title layers with:
  - `"word-by-word"` style
  - `"letter-by-letter"` style
  - Zoom effects remain active for `"fade-in"` style and default title layers

### Changed
- **Video Layer Positioning**: Removed deprecated positioning parameters (`left`, `top`, `originX`, `originY`) from video layers
- **Schema Updates**: Updated `video-schema.json` to include new animation styles and enhanced positioning
- **Tool Descriptions**: Updated MCP server tool descriptions to reflect new positioning capabilities
- **Examples**: Updated video examples to showcase new animation styles and positioning features

### Technical Details
- Based on Editly v0.16.0 changelog updates
- Maintains full backward compatibility for existing configurations
- All new parameters are optional with sensible defaults
- Schema validation ensures proper configuration structure

## [1.1.0] - 2025-10-14

### Added
- **Google Fonts Support**: Added `googleFont` property to all text layers (both image and video generation)
  - New property format: `"googleFont": "FontName:weight"` (e.g., `"Roboto:600"`)
  - Serves as an alternative to `fontPath` property
  - Cannot be used simultaneously with `fontPath`
  - Fonts are automatically downloaded from Google Fonts in the background
  - Applies to all video text layer types: title, subtitle, news-title, title-background, slide-in-text
  - Applies to image text layers
  - Can be set as a default in `defaults.layer.googleFont`

### Changed
- Updated both `image-schema.json` and `video-schema.json` to include the new `googleFont` property
- Updated tool descriptions to mention Google Fonts support
 - Enforced relative sizing (0–1 of full video) for `width`/`height` on `video` and `image-overlay` layers in `video-schema.json`; overall video `width`/`height` remain pixel-based

## [1.0.5] - 2025-10-07

### Fixed
- **CRITICAL**: Fixed capabilities declaration with correct property flags (listChanged, subscribe)
- Previous empty capabilities objects `{}` prevented MCP clients from properly discovering available tools and resources
- This was causing Cursor and other MCP clients to show "no tools, prompts or resources"
- Capabilities now properly declare: `tools: {listChanged: false}` and `resources: {subscribe: false, listChanged: false}`

## [1.0.4] - 2025-10-07

### Fixed
- Reverted to ES Modules (`"type": "module"`) for proper npx compatibility
- Fixed npx execution issue - CommonJS was causing bin entry resolution problems
- TypeScript now compiles to ES2022 modules for better npx support

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
