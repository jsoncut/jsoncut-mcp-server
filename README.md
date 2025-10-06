<p align="center">
  <img src="assets/logo.png" alt="Jsoncut Logo" width="200"/>
</p>

<h1 align="center">Jsoncut MCP Server</h1>

<p align="center">
  <strong>Model Context Protocol server for the Jsoncut API</strong><br>
  Enable AI agents to generate stunning images and videos programmatically
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@jsoncut/mcp-server"><img src="https://img.shields.io/npm/v/@jsoncut/mcp-server.svg" alt="npm version"></a>
  <a href="https://github.com/jsoncut/jsoncut-mcp-server/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License"></a>
</p>

---

## 🚀 Features

- 🎨 **Image Generation**: Create JSON configurations for image composition with layers, positioning, and effects
- 🎬 **Video Generation**: Create JSON configurations for video rendering with clips, transitions, and audio
- ✅ **Configuration Validation**: Validate configs against the Jsoncut API before submission
- 📋 **Schema Resources**: JSON schemas automatically available as MCP resources
- 🔑 **Flexible Authentication**: API key via environment variable or .env file

---

## 📦 Quick Start

### Using npx (Recommended)

```bash
export JSONCUT_API_KEY=your_api_key_here
npx -y @jsoncut/mcp-server
```

### Get Your API Key

Get your Jsoncut API key at [jsoncut.com](https://jsoncut.com)

```bash
# Set as environment variable
export JSONCUT_API_KEY=your_api_key_here

# Or create .env file
cp .env.example .env
# Edit .env and add: JSONCUT_API_KEY=your_api_key_here
```

---

## 🎯 MCP Client Configuration

### Cursor IDE

Open **Cursor Settings** → **Features** → **MCP Servers** → **"+ Add New MCP Server"**

```json
{
  "jsoncut": {
    "command": "npx",
    "args": ["-y", "@jsoncut/mcp-server"],
    "env": {
      "JSONCUT_API_KEY": "your_api_key_here"
    }
  }
}
```

### Claude Desktop

Add to your `claude_desktop_config.json`:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "jsoncut": {
      "command": "npx",
      "args": ["-y", "@jsoncut/mcp-server"],
      "env": {
        "JSONCUT_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

---

## 📚 MCP Resources

The server automatically exposes JSON schemas as MCP resources:

- **`schema://image`** - Complete image generation schema
- **`schema://video`** - Complete video generation schema

AI agents can read these directly without tool calls for fast access to all configuration options.

---

## 🛠️ Available Tools

### `create_image_config`

Create JSON configurations for image generation with a layer-based system.

**Layer Types:**
- **image**: Display images with fit modes (cover, contain, fill, inside, outside)
- **text**: Text with custom fonts, alignment, wrapping, and effects
- **rectangle**: Rectangular shapes with fill, stroke, and rounded corners
- **circle**: Circular and elliptical shapes
- **gradient**: Linear or radial color gradients

**Positioning:**
- Pixel coordinates: `{ x: 100, y: 50 }`
- Position strings: `center`, `top`, `bottom`, `top-left`, `top-right`, etc.
- Position objects: `{ x: 0.5, y: 0.5, originX: "center", originY: "center" }`

**Example:**
```json
{
  "width": 1200,
  "height": 630,
  "layers": [
    {
      "type": "gradient",
      "x": 0, "y": 0, "width": 1200, "height": 630,
      "gradient": {
        "type": "linear",
        "colors": ["#667eea", "#764ba2"],
        "direction": "diagonal"
      }
    },
    {
      "type": "text",
      "text": "Welcome to Jsoncut",
      "position": "center",
      "fontSize": 64,
      "color": "#ffffff"
    }
  ]
}
```

### `create_video_config`

Create JSON configurations for video generation with clips, layers, and transitions.

**Key Features:**
- **Clips**: Sequential video segments with individual layers
- **Layer Types**: video, image, title, subtitle, news-title, audio, gradients, and more
- **Transitions**: 75+ effects (fade, wipe, circle, cube, glitch, zoom, etc.)
- **Audio**: Background music, multiple tracks, normalization, and ducking

**Example:**
```json
{
  "width": 1920,
  "height": 1080,
  "fps": 30,
  "defaults": {
    "duration": 3,
    "transition": { "name": "fade", "duration": 1 }
  },
  "clips": [
    {
      "layers": [
        { "type": "title", "text": "Welcome", "position": "center" }
      ]
    }
  ]
}
```

### `validate_config`

Validate configurations against the Jsoncut API before submission.

**Parameters:**
- `type`: "image" or "video"
- `config`: Configuration object to validate
- `apiKey`: Optional API key (uses environment if not provided)

**Returns:**
- Validation status
- Estimated token cost
- Error details (if any)
- Detected resources with sizes

### `get_image_schema` / `get_video_schema`

Get complete JSON schemas for image or video generation. 

**Note:** Schemas are also available as MCP resources (`schema://image` and `schema://video`) which AI agents can access directly without tool calls.

---

## 📖 Workflow

1. **Create Configuration**: Use `create_image_config` or `create_video_config`
2. **Validate** (optional): Call `validate_config` if you have actual file paths
3. **Submit**: Use the configuration with the Jsoncut API

The schemas are automatically available as MCP resources, so AI agents have instant access to all configuration options.

---

## 📁 File Paths

Use placeholder paths in configurations:

```
/image/2024-01-15/userXXX/photo.jpg
/video/2024-01-15/userXXX/video.mp4
/audio/2024-01-15/userXXX/music.mp3
/font/2024-01-15/userXXX/CustomFont.ttf
```

**Supported formats:**
- Images: png, jpg, jpeg, gif, webp
- Videos: mp4, mov, avi, webm
- Audio: mp3, wav, m4a, aac
- Fonts: ttf, otf, woff, woff2

---

## 🧪 Testing

Use the MCP Inspector for interactive testing:

```bash
export JSONCUT_API_KEY=your_api_key_here
npm run inspector
```

---

## 🔧 Development

### Local Development

```bash
# Clone and install
git clone https://github.com/jsoncut/jsoncut-mcp-server.git
cd jsoncut-mcp-server
npm install

# Build
npm run build

# Watch mode
npm run watch

# Run locally
node dist/index.js
```

### Configuration with Local Build

For Cursor/Claude Desktop, use the local build:

```json
{
  "jsoncut": {
    "command": "node",
    "args": ["/absolute/path/to/jsoncut-mcp-server/dist/index.js"],
    "env": {
      "JSONCUT_API_KEY": "your_api_key_here"
    }
  }
}
```

---

## 📝 Examples

See the `examples/` directory for complete configurations:
- `image-example.json` - Image generation with multiple layer types
- `video-example.json` - Video generation with clips and transitions

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

## 🔗 Links

- **API Documentation**: [docs.jsoncut.com](https://docs.jsoncut.com)
- **Website**: [jsoncut.com](https://jsoncut.com)
- **GitHub**: [github.com/jsoncut/jsoncut-mcp-server](https://github.com/jsoncut/jsoncut-mcp-server)
- **npm**: [@jsoncut/mcp-server](https://www.npmjs.com/package/@jsoncut/mcp-server)
- **Support**: support@jsoncut.com

---

<p align="center">
  Built with the <a href="https://github.com/modelcontextprotocol">Model Context Protocol SDK</a> by Anthropic
</p>

<p align="center">
  Made with ❤️ by the Jsoncut Team
</p>
