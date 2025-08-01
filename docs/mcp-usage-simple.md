# MCP Notes Server - Usage Guide

## Overview

This is a **Model Context Protocol (MCP)** server built with Hapi.js that provides note management functionality through three essential tools. The server enables AI assistants and other clients to create, read, and list notes through standardized JSON-RPC calls.

**What is MCP?** The Model Context Protocol is an open standard that allows AI assistants to securely connect to external tools and data sources, enabling them to perform actions beyond their base capabilities.

## 🚀 Quick Start

### 1. Start the Server

```bash
docker compose up --build
```

The server will start on **port 3000** with the MCP endpoint available at `http://localhost:3000/mcp`.

You should see logs indicating:
- ✅ Server started successfully
- ✅ MCP server plugin registered successfully  
- ✅ MCP endpoints available at: /mcp

### 2. Test with MCP Inspector (Recommended)

The MCP Inspector provides a user-friendly GUI for testing your MCP server:

```bash
npx @modelcontextprotocol/inspector
```

**Connection Setup:**
1. Open the Inspector URL in your browser (displayed in terminal)
2. Configure the connection:
   - **Transport Type**: HTTP
   - **URL**: `http://localhost:3000/mcp`
3. Click **Connect**
4. Navigate to the **Tools** tab to see available tools

> **Note**: The Inspector opens to the Resources tab by default - click on the **Tools** tab to interact with note functionality.


## 🛠️ Available MCP Tools

The server provides three core tools for note management:

### 1. create_note
**Purpose**: Creates a new note with a title and content.

**Parameters**:
```json
{
  "title": "My First Note",
  "content": "This is the content of my note."
}
```

**Returns**: The newly created note ID and confirmation message.

### 2. get_note
**Purpose**: Retrieves a specific note by its unique ID.

**Parameters**:
```json
{
  "noteId": "note_1234567890_abc123def"
}
```

**Returns**: Complete note details including title, content, and metadata.

### 3. list_notes
**Purpose**: Lists all available notes with their basic information.

**Parameters**: None required
```json
{}
```

**Returns**: Array of all notes with IDs, titles, and creation dates.

## 🧪 Testing with curl Commands

You can also test the MCP server directly using curl commands:

### Initialize the Server
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {"name": "test-client", "version": "1.0.0"}
    }
  }'
```

### Create a Note
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "create_note",
      "arguments": {
        "title": "Test Note",
        "content": "This note was created via curl"
      }
    }
  }'
```

### List All Notes
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "list_notes",
      "arguments": {}
    }
  }'
```

## 📁 File Storage System

**Storage Location**: Notes are saved in the `./data/notes/` directory as individual `.txt` files.

**File Naming**: Each note gets a unique filename: `note_<timestamp>_<randomId>_<sanitized_title>.txt`

**File Format**: 
```
ID: note_1234567890_abc123def
TITLE: My First Note
CREATED: 2025-08-01T10:30:00.000Z
---
This is the content of my note.
```

**Benefits**:
- ✅ Human-readable storage format
- ✅ Easy to backup and migrate
- ✅ No database dependencies
- ✅ Version control friendly

## ⚙️ Configuration

The MCP server can be configured through environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Application environment |
| `PORT` | `3000` | Server port |
| `LOG_LEVEL` | `info` | Logging verbosity |

**MCP-Specific Settings**:
- MCP endpoint is automatically enabled at `/mcp`
- Notes directory: `./data/notes/` (created automatically)
- File permissions are handled by the container

## ✅ Implementation Status

**Core Features**:
- ✅ Create notes with title and content  
- ✅ Read notes by unique ID  
- ✅ List all notes with metadata previews  
- ✅ File-based storage system  
- ✅ Hapi.js plugin integration  
- ✅ HTTP transport support  
- ✅ JSON-RPC 2.0 protocol compliance
- ✅ Comprehensive error handling  
- ✅ Structured logging integration  
- ✅ Docker containerization
- ✅ MCP Inspector compatibility

**Architecture Highlights**:
- **Direct JSON-RPC Implementation**: No transport layer abstraction - handles MCP protocol directly in Hapi.js routes
- **Repository Pattern**: Clean separation between data access and business logic
- **Service Layer**: Encapsulated note management operations
- **Error Handling**: Proper MCP error responses with detailed logging

## 🔮 Future Enhancement Ideas

The current implementation provides a solid foundation for note management. Consider extending with:

**Additional Operations**:
- ✏️ Update/edit existing notes
- 🗑️ Delete notes functionality  
- 🔍 Search notes by content or title
- 🏷️ Tagging and categorization system

**Advanced Features**:
- 📤 Export notes (JSON, Markdown, PDF)
- 📥 Import from various formats
- 🔒 Content validation and sanitization
- 📊 Usage analytics and metrics
- 🔐 Authentication and access control

**Performance Optimizations**:
- 💾 Caching layer for frequently accessed notes
- 📚 Pagination for large note collections
- 🗜️ File compression for storage efficiency

## 🐛 Troubleshooting

### Common Issues and Solutions

**1. Server Won't Start**
```bash
# Check if port 3000 is in use
lsof -i :3000
# Or try a different port in docker-compose.yml
```

**2. MCP Connection Fails**
- ✅ Verify server is running: `curl http://localhost:3000/health`
- ✅ Check MCP endpoint: `curl http://localhost:3000/mcp` (should return method not allowed)
- ✅ Ensure correct URL in Inspector: `http://localhost:3000/mcp`
- ✅ Use HTTP transport type (not WebSocket or stdio)

**3. Notes Not Saving**
```bash
# Check directory permissions
ls -la data/notes/
# Ensure Docker has write access to the directory
```

**4. Inspector Not Connecting**
- ✅ Make sure both server and inspector are running
- ✅ Try refreshing the inspector page
- ✅ Check browser console for JavaScript errors
- ✅ Verify no firewall blocking localhost connections

**5. JSON-RPC Errors**
- ✅ Ensure Content-Type is `application/json`
- ✅ Check JSON syntax in curl commands
- ✅ Verify method names exactly match: `initialize`, `tools/list`, `tools/call`

### Getting Help

**View Logs**:
```bash
# Real-time server logs
docker compose logs -f node-mcp-server-demo-development

# Debug mode with verbose logging
LOG_LEVEL=debug docker compose up --build
```

**Health Checks**:
```bash
# Basic health check
curl http://localhost:3000/health

# Detailed system status
curl http://localhost:3000/health/ready
```

**Validate Setup**:
```bash
# Check if MCP tools are registered
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

> **Tip**: When reporting issues, include the server logs and the exact steps you followed. This helps identify the root cause quickly.

