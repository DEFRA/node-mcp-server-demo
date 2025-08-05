# MCP vs REST Endpoints: Dual Protocol Architecture

## Overview

This document explains why our implementation maintains both MCP transport endpoints and traditional REST endpoints, and how they work together to provide comprehensive API access.

## Architecture Decision

We implement **dual protocol support** to serve different client types and use cases:

```
┌─────────────────────────────────────────────────────────┐
│                   Client Layer                          │
├─────────────────────┬───────────────────────────────────┤
│    MCP Clients      │      REST Clients                 │
│  (AI Assistants)    │   (Web Apps, Scripts)             │
└─────────────────────┼───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│                 Hapi.js Server                          │
├─────────────────────┬───────────────────────────────────┤
│  MCP Transport      │    REST Endpoints                 │
│    /api/v1/mcp      │    /api/v1/mcp/*                  │
│  (Protocol Layer)   │  (HTTP JSON API)                  │
└─────────────────────┼───────────────────────────────────┘
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

## Traditional REST Endpoints

### Purpose
- **HTTP Compliance**: Standard REST API patterns
- **Web Integration**: Easy integration with web applications
- **Documentation**: OpenAPI/Swagger compatible
- **Backwards Compatibility**: Maintains existing API contracts

### Endpoint Structure
```
GET    /api/v1/mcp/notes       # List all notes
POST   /api/v1/mcp/notes       # Create new note
GET    /api/v1/mcp/notes/{id}  # Get specific note
PUT    /api/v1/mcp/notes/{id}  # Update note
DELETE /api/v1/mcp/notes/{id}  # Delete note
```

### Request Format (REST)
```json
POST /api/v1/mcp/notes
{
  "title": "My Note",
  "content": "Note content"
}
```

### Features
- ✅ RESTful resource naming
- ✅ HTTP status codes
- ✅ Joi schema validation
- ✅ Standard HTTP methods
- ✅ JSON request/response
- ✅ Stateless operation

## Key Differences

| Aspect | MCP Transport | REST Endpoints |
|--------|---------------|----------------|
| **Protocol** | MCP Specification | HTTP REST |
| **Session** | Stateful | Stateless |
| **Validation** | Zod Schemas | Joi Schemas |
| **Streaming** | Server-Sent Events | Request/Response |
| **Client Type** | AI Assistants | Web Applications |
| **Error Format** | MCP Error Objects | HTTP Status + JSON |
| **Documentation** | MCP Schema | OpenAPI/Swagger |

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

### REST API Handler
```javascript
// /src/api/v1/mcp/endpoints/mcp.js
export const mcpRoutes = [
  {
    method: 'POST',
    path: '/api/v1/mcp/notes',
    handler: createNote,
    options: {
      description: 'Create a new note',
      tags: ['api', 'notes'],
      validate: {
        payload: createNoteSchema
      }
    }
  },
  {
    method: 'GET',
    path: '/api/v1/mcp/notes',
    handler: listNotes,
    options: {
      description: 'List all notes',
      tags: ['api', 'notes']
    }
  }
]
```

## Shared Business Logic

Both endpoint types use the same underlying services:

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

## When to Use Which?

### Use MCP Transport When:
- Building AI assistant integrations
- Need real-time streaming capabilities
- Require session-based communication
- Working with MCP-compatible tools
- Building stateful applications

### Use REST Endpoints When:
- Building web applications
- Need simple HTTP integration
- Want stateless communication
- Require OpenAPI documentation
- Building mobile applications

## Benefits of Dual Protocol

### 1. **Client Flexibility**
- AI assistants can use MCP protocol
- Web apps can use REST APIs
- Different teams can choose appropriate protocol

### 2. **Future-Proofing**
- MCP adoption can happen gradually
- Existing REST clients continue working
- New capabilities available via MCP

### 3. **Development Efficiency**
- Single business logic implementation
- Consistent data models
- Shared validation and error handling

### 4. **Testing & Debugging**
- REST endpoints easier to test manually
- MCP endpoints provide full protocol features
- Both protocols validate same business logic

## Migration Strategy

For organizations wanting to adopt MCP:

1. **Phase 1**: Keep existing REST endpoints
2. **Phase 2**: Add MCP transport alongside REST
3. **Phase 3**: Migrate AI tools to MCP protocol
4. **Phase 4**: Consider deprecating REST if no longer needed

This approach ensures zero downtime and gradual adoption of MCP capabilities.
