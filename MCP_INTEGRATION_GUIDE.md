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

## Understanding JSON-RPC and MCP

### What is JSON-RPC?

**JSON-RPC** is a remote procedure call (RPC) protocol encoded in JSON. It's a stateless, lightweight protocol that defines how to structure requests and responses for calling methods on remote servers.

#### JSON-RPC 2.0 Structure

**Request Format:**
```json
{
  "jsonrpc": "2.0",          // Protocol version (required)
  "method": "method_name",    // Method to call (required)
  "params": { ... },          // Method parameters (optional)
  "id": 1                     // Request identifier (required for requests expecting response)
}
```

**Success Response:**
```json
{
  "jsonrpc": "2.0",          // Protocol version (required)
  "result": { ... },          // Method result (required on success)
  "id": 1                     // Matches request ID (required)
}
```

**Error Response:**
```json
{
  "jsonrpc": "2.0",          // Protocol version (required)
  "error": {                  // Error object (required on error)
    "code": -32602,           // Error code (integer)
    "message": "Invalid params" // Error message (string)
  },
  "id": 1                     // Matches request ID (required)
}
```

### Why MCP Uses JSON-RPC

The **Model Context Protocol** is built on top of JSON-RPC because:

1. **Standardized Structure**: JSON-RPC provides a well-defined, language-agnostic way to call remote methods
2. **Bi-directional Communication**: Both client and server can initiate calls
3. **Error Handling**: Built-in error code system for consistent error reporting
4. **Transport Agnostic**: Works over HTTP, WebSockets, stdio, etc.
5. **Simple but Powerful**: Easy to implement while supporting complex interactions

#### MCP-Specific JSON-RPC Methods

MCP defines specific methods that servers must implement:

```javascript
// Initialize connection
{"jsonrpc": "2.0", "method": "initialize", "params": {...}}

// List available tools
{"jsonrpc": "2.0", "method": "tools/list", "params": {}}

// Call a specific tool
{"jsonrpc": "2.0", "method": "tools/call", "params": {"name": "create_note", "arguments": {...}}}

// List resources
{"jsonrpc": "2.0", "method": "resources/list", "params": {}}

// List prompts
{"jsonrpc": "2.0", "method": "prompts/list", "params": {}}
```

### MCP Protocol Compliance

**✅ Our implementation is fully MCP compliant** because we:

1. **Implement Required Methods**: `initialize`, `tools/list`, `tools/call`
2. **Follow JSON-RPC 2.0 Spec**: Proper request/response structure
3. **Return Correct Capabilities**: Server capabilities in `initialize` response
4. **Use Standard Error Codes**: JSON-RPC error codes (-32600, -32602, etc.)
5. **Follow Tool Schema**: Proper tool definitions with input schemas
6. **Handle Notifications**: Support for `notifications/initialized`

**According to the [MCP Specification](https://github.com/modelcontextprotocol/typescript-sdk):**
- MCP is a **protocol** built on JSON-RPC 2.0
- Servers can implement the protocol in any way that follows the spec
- Transport layer is **separate** from protocol compliance

## Why Direct JSON-RPC Implementation?

### The Transport Layer Problem

The MCP SDK provides transport layers like `StreamableHTTPServerTransport`, which are designed for **standalone MCP servers**. However, when integrating with existing web frameworks like Hapi.js, these transports create conflicts:

#### What Transport Layers Do
```javascript
// This is what StreamableHTTPServerTransport expects:
const transport = new StreamableHTTPServerTransport(server, "http://localhost:3000")
// It wants to:
// 1. Handle raw HTTP requests directly
// 2. Parse HTTP bodies itself  
// 3. Manage WebSocket connections
// 4. Handle session management
// 5. Process MCP protocol
```

#### The Framework Conflict
```javascript
// But Hapi.js already does this:
server.route({
  method: 'POST',
  path: '/mcp',
  handler: async (request, h) => {
    // Hapi has already:
    // 1. Parsed the HTTP request
    // 2. Parsed JSON payload  
    // 3. Applied middleware
    // 4. Validated input
    // request.payload is already a JavaScript object!
  },
  options: {
    payload: { parse: true } // Hapi parses JSON automatically
  }
})
```

**The Problem**: Two systems trying to do the same job leads to:
- Payload parsing conflicts (Buffer vs Object)
- Request processing duplication
- Session management interference
- Error handling confusion

### Our Solution: Direct JSON-RPC Implementation

Instead of fighting the framework, we **embrace it** and implement JSON-RPC directly:

```javascript
handler: async (request, h) => {
  const payload = request.payload // Already parsed by Hapi
  
  // Validate JSON-RPC structure
  if (!payload?.jsonrpc || !payload?.method) {
    return h.response({
      jsonrpc: '2.0',
      error: { code: -32600, message: 'Invalid Request' },
      id: payload?.id || null
    }).code(400)
  }

  // Handle MCP methods directly
  switch (payload.method) {
    case 'initialize':
      return h.response({
        jsonrpc: '2.0',
        result: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: { name: 'notes-server', version: '1.0.0' }
        },
        id: payload.id
      })
    
    case 'tools/call':
      // Execute tool and return MCP-compliant response
      const result = await executeToolSafely(payload.params)
      return h.response({
        jsonrpc: '2.0',
        result,
        id: payload.id
      })
  }
}
```

### Pros and Cons Analysis

#### ✅ Advantages of Direct Implementation

**1. Framework Integration**
- ✅ Works seamlessly with Hapi.js middleware
- ✅ Leverages existing authentication, validation, logging
- ✅ No conflicts with request processing pipeline
- ✅ Can use Hapi's built-in features (caching, rate limiting, etc.)

**2. Control and Flexibility**
- ✅ Full control over request/response handling
- ✅ Custom error handling specific to your application
- ✅ Easy to add custom middleware or processing
- ✅ Simplified debugging - one less abstraction layer

**3. Performance**
- ✅ No unnecessary abstraction overhead
- ✅ Direct access to Hapi's optimized request processing
- ✅ Reduced memory usage (no duplicate parsing)
- ✅ Better error reporting and logging

**4. Maintainability**
- ✅ Follows existing codebase patterns
- ✅ Easier to understand for team members familiar with Hapi
- ✅ No external transport dependencies to maintain
- ✅ Clear separation of concerns

#### ❌ Disadvantages of Direct Implementation

**1. Manual Protocol Implementation**
- ❌ Must manually implement JSON-RPC validation
- ❌ Need to handle all MCP method routing yourself
- ❌ More boilerplate code compared to using SDK transports
- ❌ Must stay updated with MCP protocol changes manually

**2. Limited SDK Benefits**
- ❌ Can't use SDK's built-in session management
- ❌ Miss out on automatic protocol validation
- ❌ No built-in connection lifecycle management
- ❌ Must implement error codes manually

**3. Protocol Compliance Risk**
- ❌ Risk of implementing protocol incorrectly
- ❌ Need deep understanding of JSON-RPC and MCP specs
- ❌ Must test compliance thoroughly
- ❌ Potential for subtle protocol violations

**4. Code Duplication**
- ❌ Similar JSON-RPC logic might be needed across projects
- ❌ Can't easily reuse transport-layer optimizations from SDK
- ❌ More testing required for protocol compliance

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

### MCP Protocol Compliance Verification

**✅ Our implementation fully complies with MCP protocol** as defined in the [official specification](https://github.com/modelcontextprotocol/typescript-sdk). Here's the compliance checklist:

#### Required MCP Methods ✅
- ✅ **`initialize`**: Returns server capabilities and info
- ✅ **`tools/list`**: Lists available tools with schemas  
- ✅ **`tools/call`**: Executes tools and returns results
- ✅ **`notifications/initialized`**: Handles initialization complete

#### JSON-RPC 2.0 Compliance ✅
- ✅ **Request Structure**: Validates `jsonrpc`, `method`, `id` fields
- ✅ **Response Structure**: Returns `jsonrpc`, `result`/`error`, `id`
- ✅ **Error Codes**: Uses standard codes (-32600, -32602, -32603)
- ✅ **Content Type**: Accepts and returns `application/json`

#### MCP-Specific Requirements ✅
- ✅ **Protocol Version**: Returns `"2024-11-05"` in initialize
- ✅ **Capabilities**: Declares `tools: {}` capability
- ✅ **Tool Schemas**: Provides JSON Schema for tool inputs
- ✅ **Content Format**: Returns `content: [{ type: 'text', text: '...' }]`

#### Validation Test
```bash
# This request/response cycle proves full compliance:

# Request (standard MCP initialize)
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "method": "initialize", "params": {"protocolVersion": "2024-11-05", "capabilities": {}, "clientInfo": {"name": "test", "version": "1.0"}}}'

# Response (compliant MCP response)
{
  "jsonrpc": "2.0",
  "result": {
    "protocolVersion": "2024-11-05",
    "capabilities": { "tools": {}, "prompts": {}, "resources": {} },
    "serverInfo": { "name": "notes-server", "version": "1.0.0" }
  },
  "id": 1
}
```

### When to Use Each Approach

#### Use Direct JSON-RPC Implementation When:
- ✅ **Integrating with existing web frameworks** (Express, Hapi, Fastify)
- ✅ **Need tight control** over request/response processing
- ✅ **Want to leverage framework middleware** (auth, validation, logging)
- ✅ **Building production APIs** with custom requirements
- ✅ **Team is familiar** with the web framework

#### Use MCP SDK Transports When:
- ✅ **Building standalone MCP servers** from scratch
- ✅ **Rapid prototyping** of MCP functionality
- ✅ **Want automatic protocol compliance** validation
- ✅ **Need built-in session management** features
- ✅ **Using stdio or WebSocket** transports

### Real-World Examples

#### Our Hapi.js Implementation (Direct JSON-RPC)
```javascript
// Clean integration with Hapi's ecosystem
{
  method: 'POST',
  path: '/mcp',
  handler: async (request, h) => {
    // JSON-RPC handling within Hapi context
    return handleMcpRequest(request.payload, h)
  },
  options: {
    auth: 'jwt-strategy',           // Use Hapi auth
    validate: { payload: mcpSchema }, // Use Hapi validation
    pre: [{ method: rateLimiter }]   // Use Hapi middleware
  }
}
```

#### Equivalent SDK Transport Implementation
```javascript
// Standalone server approach
const server = new McpServer({ name: 'notes', version: '1.0.0' })
const transport = new StreamableHTTPServerTransport(httpServer, baseUrl)

server.registerTool('create_note', schema, handler)
await server.connect(transport)
// Less integration, more isolation
```

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
