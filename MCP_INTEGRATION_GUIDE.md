# MCP Integration with Hapi.js - Complete Guide

This document captures the key learnings from integrating the [Model Context Protocol (MCP)](https://github.com/modelcontextprotocol/typescript-sdk) with a Hapi.js backend server, including the challenges encountered and their solutions.

## Table of Contents

- [Overview](#overview)
- [The Challenge](#the-challenge)
- [Issues Encountered](#issues-encountered)
- [Solution Approach](#solution-approach)
- [Implementation Details](#implementation-details)
- [Best Practices](#best-practices)
- [Testing](#testing)
- [Future Recommendations](#future-recommendations)

## Overview

The Model Context Protocol (MCP) enables AI assistants to securely connect to local and remote resources. This project successfully integrates MCP with a Hapi.js REST API backend to provide note management capabilities through the MCP protocol.

### Architecture
- **Backend**: Node.js with Hapi.js framework
- **MCP Server**: @modelcontextprotocol/sdk
- **Storage**: File-based repository pattern
- **Protocol**: JSON-RPC over HTTP

## The Challenge

The primary challenge was integrating MCP's transport layer with an existing Hapi.js application. MCP provides several transport options, but most are designed for standalone applications rather than integration within existing HTTP frameworks.

## Issues Encountered

### 1. Transport Layer Conflicts

**Problem**: Initial attempts to use `StreamableHTTPServerTransport` failed because:
- Hapi.js was already processing HTTP requests
- The transport expected raw Node.js request/response objects
- Payload parsing conflicts between Hapi and MCP transport
- Request ID collisions in concurrent scenarios

**Error Examples**:
```
Error POSTing to endpoint (HTTP 500): {"jsonrpc":"2.0","error":{"code":-32603,"message":"Internal server error"},"id":null}

Not Acceptable: Client must accept both application/json and text/event-stream

Parse error: Invalid literal value, expected "2.0"
```

### 2. Payload Processing Issues

**Problem**: When using `StreamableHTTPServerTransport`:
- Setting `payload: { parse: false }` caused JSON to be treated as Buffer
- Setting `payload: { parse: true }` caused conflicts with transport expectations
- The transport's `handleRequest` method expected unprocessed requests

### 3. Session Management Complexity

**Problem**: `StreamableHTTPServerTransport` includes session management that was unnecessary for our stateless use case and added complexity.

## Solution Approach

### Decision: Direct JSON-RPC Implementation

Instead of fighting with transport layer abstractions, we implemented **direct JSON-RPC handling** within Hapi route handlers. This approach:

1. **Leverages Hapi's strengths** (routing, validation, middleware)
2. **Eliminates transport conflicts** by handling JSON-RPC directly
3. **Provides full control** over request/response processing
4. **Simplifies integration** with existing services

### Architecture Overview

```
MCP Client → HTTP POST /mcp → Hapi Route Handler → JSON-RPC Parser → Service Layer → Response
```

## Implementation Details

### 1. Route Structure

```javascript
// src/api/v1/mcp/routes/mcp.js
function createMcpRoutes(mcpServer, noteService) {
  return [
    {
      method: 'POST',
      path: '/mcp',
      handler: async (request, h) => {
        // Direct JSON-RPC handling
        const payload = request.payload
        
        // Handle MCP methods: initialize, tools/list, tools/call
        switch (payload.method) {
          case 'initialize':
            // Return server capabilities
          case 'tools/list':
            // Return available tools
          case 'tools/call':
            // Execute tool and return result
        }
      },
      options: {
        payload: { parse: true, allow: 'application/json' }
      }
    }
  ]
}
```

### 2. MCP Method Handlers

#### Initialize
```javascript
case 'initialize':
  response = {
    jsonrpc: '2.0',
    result: {
      protocolVersion: '2024-11-05',
      capabilities: { tools: {}, prompts: {}, resources: {} },
      serverInfo: { name: 'notes-server', version: '1.0.0' }
    },
    id: payload.id
  }
```

#### Tools List
```javascript
case 'tools/list':
  response = {
    jsonrpc: '2.0',
    result: {
      tools: [
        {
          name: 'create_note',
          description: 'Create a new note with title and content',
          inputSchema: { /* JSON Schema */ }
        }
        // ... other tools
      ]
    },
    id: payload.id
  }
```

#### Tool Execution
```javascript
case 'tools/call': {
  const toolName = payload.params?.name
  const toolArguments = payload.params?.arguments || {}
  
  switch (toolName) {
    case 'create_note':
      const noteResult = await noteService.createNote(toolArguments)
      result = {
        content: [{
          type: 'text',
          text: `✅ Note created successfully!\n**Title:** ${noteResult.details.title}`
        }]
      }
      break
  }
}
```

### 3. Service Integration

The implementation integrates seamlessly with existing Hapi services:

```javascript
// src/api/plugins/mcp.js
const mcpRoutes = createMcpRoutes(mcpServer, noteService)
server.route(mcpRoutes)
```

### 4. Error Handling

Proper JSON-RPC error responses:

```javascript
// Validation errors
{
  jsonrpc: '2.0',
  error: { code: -32602, message: 'Invalid params' },
  id: payload.id
}

// Tool execution errors
{
  jsonrpc: '2.0',
  result: {
    content: [{ type: 'text', text: '❌ Error: ...' }],
    isError: true
  },
  id: payload.id
}
```

## Best Practices

### 1. For Hapi.js Integration

✅ **DO**: Use direct JSON-RPC handling in Hapi route handlers
✅ **DO**: Leverage Hapi's built-in JSON parsing with `payload: { parse: true }`
✅ **DO**: Use Hapi's validation and middleware capabilities
✅ **DO**: Integrate with existing service layer architecture

❌ **DON'T**: Try to use `StreamableHTTPServerTransport` within Hapi
❌ **DON'T**: Bypass Hapi's request processing pipeline
❌ **DON'T**: Use `h.abandon` unless you're handling responses manually

### 2. JSON-RPC Implementation

✅ **DO**: Validate `jsonrpc`, `method`, and `id` fields
✅ **DO**: Return proper error codes (-32600, -32602, -32603, etc.)
✅ **DO**: Include request `id` in all responses
✅ **DO**: Handle method not found scenarios

### 3. Tool Implementation

✅ **DO**: Provide comprehensive input schemas
✅ **DO**: Return structured content with `type: 'text'`
✅ **DO**: Include error indicators with `isError: true`
✅ **DO**: Validate tool arguments before execution

### 4. File Format Considerations

When implementing file-based storage, ensure consistent formatting:

```javascript
// Correct format (no extra indentation)
toFileContent() {
  return `ID: ${this.id}
TITLE: ${this.title}
CREATED: ${this.createdAt.toISOString()}
---
${this.content}`
}
```

## Testing

### Manual Testing Examples

```bash
# Initialize MCP connection
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {"protocolVersion": "2024-11-05", "capabilities": {}, "clientInfo": {"name": "test-client", "version": "1.0.0"}}}'

# List available tools
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "id": 2, "method": "tools/list"}'

# Create a note
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "id": 3, "method": "tools/call", "params": {"name": "create_note", "arguments": {"title": "Test Note", "content": "Hello World!"}}}'

# List notes
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "id": 4, "method": "tools/call", "params": {"name": "list_notes", "arguments": {}}}'
```

### Expected Responses

All responses should follow JSON-RPC 2.0 format:
- Success: `{"jsonrpc": "2.0", "result": {...}, "id": 1}`
- Error: `{"jsonrpc": "2.0", "error": {"code": -32603, "message": "..."}, "id": 1}`

## Future Recommendations

### 1. For New Hapi.js + MCP Projects

1. **Start with direct JSON-RPC implementation** - don't attempt transport abstractions
2. **Design tools first** - define your MCP tools before implementing routes
3. **Use Hapi plugins** - encapsulate MCP functionality in a reusable plugin
4. **Implement comprehensive validation** - validate both MCP protocol and tool arguments
5. **Add proper logging** - log MCP method calls for debugging

### 2. Alternative Frameworks

If using other Node.js frameworks:

- **Express**: Similar approach, use middleware for JSON-RPC parsing
- **Fastify**: Leverage schema validation for MCP protocol
- **Standalone**: Consider using MCP's provided transports

### 3. Production Considerations

- **Authentication**: Add authentication middleware before MCP routes
- **Rate limiting**: Implement rate limiting for MCP endpoints
- **Monitoring**: Add metrics for MCP tool usage
- **Validation**: Strict input validation for security
- **Error handling**: Comprehensive error logging and user-friendly messages

### 4. Transport Selection Guide

| Use Case | Recommended Transport |
|----------|----------------------|
| Standalone MCP server | `StreamableHTTPServerTransport` |
| Integration with Express | Direct JSON-RPC handling |
| Integration with Hapi.js | Direct JSON-RPC handling |
| Integration with Fastify | Direct JSON-RPC handling |
| Desktop applications | `StdioServerTransport` |
| WebSocket communication | Custom transport |

## Conclusion

The key insight is that **MCP is a protocol, not just a transport layer**. For web framework integration, implementing the JSON-RPC protocol directly often provides better results than trying to abstract it away with transport layers designed for different use cases.

This approach:
- ✅ Provides full control over request/response handling
- ✅ Integrates cleanly with existing architecture
- ✅ Avoids transport layer conflicts
- ✅ Simplifies debugging and testing
- ✅ Maintains framework conventions and best practices

The MCP protocol itself is straightforward - the complexity comes from trying to integrate transport abstractions that weren't designed for your specific use case. When in doubt, implement the protocol directly.
