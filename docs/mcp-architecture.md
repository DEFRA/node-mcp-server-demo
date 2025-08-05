# MCP Protocol Architecture

## Overview

This document explains our implementation of the MCP transport endpoint and how it provides comprehensive API access for AI assistants and protocol-compliant clients.

## Architecture Decision

We implement the **MCP protocol** to serve modern client types and use cases:

```
┌─────────────────────────────────────────────────────────┐
│                   Client Layer                          │
├─────────────────────┬───────────────────────────────────┤
│    MCP Clients      │                                   │
│  (AI Assistants)    │                                   │
└─────────────────────┴───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│                 Hapi.js Server                          │
├─────────────────────────────────────────────────────────┤
│  MCP Transport      /api/v1/mcp (Protocol Layer)         │
└─────────────────────┴───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│              Shared Business Logic                      │
│            (Services & Repositories)                    │
└─────────────────────────────────────────────────────────┘
```

## MCP Transport Endpoints

### Purpose
- **Protocol Compliance**: Implements official MCP specification
- **AI Assistant Integration**: Designed for AI tools and assistants
- **Streaming Support**: Server-Sent Events for real-time communication
- **Session Management**: Stateful connections with lifecycle management

### Endpoint Structure
```
POST /api/v1/mcp               # Main transport endpoint
GET  /api/v1/mcp/{sessionId}   # SSE endpoint for streaming
DELETE /api/v1/mcp/{sessionId} # Session cleanup
```

### Request Format (MCP Protocol)
```json
{
  "method": "tools/call",
  "params": {
    "name": "create_note",
    "arguments": {
      "title": "My Note",
      "content": "Note content"
    }
  }
}
```

### Features
- ✅ Session-based communication
- ✅ Server-Sent Events streaming
- ✅ Protocol-compliant error handling
- ✅ Zod schema validation
- ✅ DNS rebinding protection
- ✅ CORS for browser clients

## Key Differences (MCP vs REST)

| Aspect | MCP Transport |
|--------|---------------|
| **Protocol** | MCP Specification |
| **Session** | Stateful |
| **Validation** | Zod Schemas |
| **Streaming** | Server-Sent Events |
| **Client Type** | AI Assistants |
| **Error Format** | MCP Error Objects |
| **Documentation** | MCP Schema |

## Code Implementation

### MCP Transport Handler
```javascript
// /src/api/v1/mcp/endpoints/mcp-transport.js
export const mcpTransportRoutes = [
  {
    method: 'POST',
    path: '/api/v1/mcp',
    handler: async (request, h) => {
      const sessionId = request.headers['mcp-session-id'] || 
                       `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      // Handle MCP protocol messages
      const { method, params } = request.payload
      switch (method) {
        case 'initialize':
          return handleInitialize(sessionId, params, h)
        case 'tools/list':
          return handleToolsList(sessionId, h)
        case 'tools/call':
          return handleToolCall(sessionId, params, h)
        default:
          throw Boom.badRequest(`Unknown method: ${method}`)
      }
    }
  }
]
```

## Shared Business Logic

All MCP operations use the same underlying services:

```javascript
// Shared service layer
class NoteService {
  async createNote(details) {
    const note = await this.noteRepository.create({ details })
    return { details: note.details }
  }

  async getNoteById(id) {
    const note = await this.noteRepository.findById(id)
    if (!note) return null
    return { details: note.details }
  }

  async listAllNotes() {
    const notes = await this.noteRepository.getAll()
    return notes.map(note => ({ details: note.details }))
  }
}
```

## When to Use MCP Transport
- Building AI assistant integrations
- Need real-time streaming capabilities
- Require session-based communication
- Working with MCP-compatible tools
- Building stateful applications

## Benefits of MCP Protocol

### 1. **Client Flexibility**
- AI assistants can use MCP protocol
- Modern clients can leverage streaming and session features

### 2. **Future-Proofing**
- MCP adoption can happen gradually
- New capabilities available via MCP

### 3. **Development Efficiency**
- Single business logic implementation
- Consistent data models
- Shared validation and error handling

### 4. **Testing & Debugging**
- MCP endpoints provide full protocol features
- All protocol logic validated through a single interface

## Migration Strategy

For organizations wanting to adopt MCP:

1. **Phase 1**: Keep existing REST endpoints (if present)
2. **Phase 2**: Add MCP transport alongside REST
3. **Phase 3**: Migrate AI tools to MCP protocol
4. **Phase 4**: Consider deprecating REST if no longer needed

This approach ensures zero downtime and gradual adoption of MCP capabilities.
