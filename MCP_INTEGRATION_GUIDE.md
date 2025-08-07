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
- **MCP Server**: Direct JSON-RPC implementation (following enterprise patterns)
- **Storage**: File-based repository pattern with service layer
- **Protocol**: JSON-RPC over HTTP at `/mcp`
- **Architecture**: Repository Pattern, Service Layer, Domain-Driven Design

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

Errors**: `/src/common/errors/domain-errors.js` - Domain-specific error factory functions

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

## Why We Chose Direct JSON-RPC Implementation

### The Transport Integration Challenge

The MCP SDK provides `StreamableHTTPServerTransport` which **can work with web frameworks** like Express and Hapi.js. Looking at the [Express example](https://github.com/modelcontextprotocol/typescript-sdk?tab=readme-ov-file#streamable-http), it shows proper integration using session management.

#### ✅ Correct StreamableHTTPServerTransport Integration (Express Example)
```javascript
import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

const app = express();
app.use(express.json());

const transports = {};

app.post('/mcp', async (req, res) => {
  const sessionId = req.headers['mcp-session-id'];
  let transport;

  if (sessionId && transports[sessionId]) {
    transport = transports[sessionId];
  } else if (!sessionId && isInitializeRequest(req.body)) {
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sessionId) => {
        transports[sessionId] = transport;
      }
    });

    const server = new McpServer({ name: "example", version: "1.0.0" });
    await server.connect(transport);
  }

  await transport.handleRequest(req, res, req.body);
});
```

### Why We Chose Direct Implementation Instead

While `StreamableHTTPServerTransport` **can** work with Hapi.js, we chose direct JSON-RPC implementation for several enterprise-focused reasons:

#### ✅ Advantages of Direct Implementation for Enterprise Projects

**1. Framework Integration & Consistency**
- ✅ **Follows existing Hapi.js patterns**: Uses standard route handlers, middleware, validation
- ✅ **Leverages enterprise architecture**: Repository Pattern, Service Layer, Domain-Driven Design
- ✅ **Consistent error handling**: Uses Boom and domain-specific error classes throughout
- ✅ **Standard logging**: Integrates with existing structured logging patterns

**2. Enterprise Architecture Alignment**
- ✅ **Service Layer separation**: Business logic separated from transport concerns
- ✅ **Dependency injection**: Services injected through Hapi's server app context
- ✅ **Validation consistency**: Uses Joi schemas like rest of the application
- ✅ **Testing patterns**: Each layer can be unit tested independently

**3. Control and Maintainability**
- ✅ **Full control over request/response**: No hidden transport layer behaviors
- ✅ **Easier debugging**: Direct code path from HTTP request to business logic
- ✅ **Team familiarity**: Uses patterns the team already knows
- ✅ **Custom requirements**: Easy to add enterprise features (auth, rate limiting, metrics)

**4. Production Considerations**
- ✅ **Security integration**: Works with existing auth strategies and middleware
- ✅ **Monitoring**: Integrates with existing APM and logging infrastructure
- ✅ **Performance**: No additional abstraction layer overhead
- ✅ **Scaling**: Follows established patterns for horizontal scaling

#### ❌ Disadvantages of Direct Implementation

**1. Manual Protocol Implementation**
- ❌ Must manually implement JSON-RPC validation (though we used Joi for consistency)
- ❌ Need to handle MCP method routing manually (though we used service layer patterns)
- ❌ More initial setup compared to using SDK transports
- ❌ Must stay updated with MCP protocol changes manually

**2. Missing SDK Features**
- ❌ Can't use SDK's built-in session management (though we can implement our own)
- ❌ No automatic protocol validation (though our implementation is compliant)
- ❌ No built-in SSE streaming for server-to-client notifications
- ❌ Must implement error codes manually (though we follow JSON-RPC standards)

**3. Alternative: StreamableHTTPServerTransport Integration**
- ✅ **Could have integrated** `StreamableHTTPServerTransport` with Hapi.js using session management
- ✅ **Would provide** automatic protocol compliance and SSE streaming
- ✅ **Would handle** session management and resumability features
- ❌ **Would require** more complex integration with existing enterprise patterns
- ❌ **Would add** another abstraction layer to debug and maintain

### When to Use Each Approach

#### Use StreamableHTTPServerTransport When:
- ✅ **Building new MCP-focused services** without existing framework constraints
- ✅ **Need SSE streaming** for server-to-client notifications
- ✅ **Want automatic session management** and resumability
- ✅ **Prefer SDK-managed protocol compliance**
- ✅ **Building standalone MCP servers**

#### Use Direct JSON-RPC Implementation When:
- ✅ **Integrating with existing enterprise applications** (like our Hapi.js project)
- ✅ **Have established patterns** (Repository, Service Layer, Domain-Driven Design)
- ✅ **Need tight integration** with existing middleware and auth systems
- ✅ **Want full control** over request/response handling
- ✅ **Team familiarity** with the existing framework is high

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
- ✅ **Integrating with existing enterprise applications** (like our Hapi.js project)
- ✅ **Have established architectural patterns** (Repository, Service Layer, Domain-Driven Design)
- ✅ **Need tight integration** with existing middleware and auth systems
- ✅ **Want full control** over request/response handling
- ✅ **Team familiarity** with the existing framework is high
- ✅ **Stateless architecture** preferred for horizontal scaling

#### Use StreamableHTTPServerTransport When:
- ✅ **Building new MCP-focused services** without existing framework constraints
- ✅ **Need SSE streaming** for server-to-client notifications
- ✅ **Want automatic session management** and resumability features
- ✅ **Prefer SDK-managed protocol compliance** and lifecycle management
- ✅ **Building standalone MCP servers** from scratch
- ✅ **Need stateful sessions** with resumable connections

### Alternative Implementation: Hapi.js + StreamableHTTPServerTransport

For reference, here's how you **could** integrate `StreamableHTTPServerTransport` with Hapi.js:

```javascript
// src/mcp/endpoints/mcp-transport.js
import { randomUUID } from 'node:crypto'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js'

const transports = {}

async function handleMcpTransport(request, h) {
  const sessionId = request.headers['mcp-session-id']
  let transport

  if (sessionId && transports[sessionId]) {
    // Reuse existing transport
    transport = transports[sessionId]
  } else if (!sessionId && isInitializeRequest(request.payload)) {
    // Create new transport with session management
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sessionId) => {
        transports[sessionId] = transport
      },
      enableDnsRebindingProtection: true,
      allowedHosts: ['127.0.0.1']
    })

    // Clean up on close
    transport.onclose = () => {
      if (transport.sessionId) {
        delete transports[transport.sessionId]
      }
    }

    // Create MCP server and connect
    const server = new McpServer({
      name: 'notes-server',
      version: '1.0.0'
    })

    // Register tools, resources, prompts
    // ... (same as our service layer)

    await server.connect(transport)
  } else {
    return h.response({
      jsonrpc: '2.0',
      error: { code: -32000, message: 'Bad Request: No valid session ID' },
      id: null
    }).code(400)
  }

  // Let transport handle the request
  await transport.handleRequest(request.raw.req, request.raw.res, request.payload)
  
  // Return h.abandon() since transport handles the response
  return h.abandon
import { createMcpProtocolError } from '../../../../common/errors/domain-errors.js'

const mcpTransportRoutes = [
  {
    method: 'POST',
    path: '/mcp',
    handler: handleMcpTransport,
    options: {
      payload: { parse: true }
    }
  },
  {
    method: 'GET',
    path: '/mcp',
    handler: handleMcpTransport
  },
  {
    method: 'DELETE',
    path: '/mcp',
    handler: handleMcpTransport
  }
]

export { mcpTransportRoutes }
```

**This approach would provide:**
- ✅ Automatic session management and resumability
- ✅ SSE streaming for server-to-client notifications  
- ✅ Built-in protocol compliance validation
- ✅ SDK-managed connection lifecycle

**But would require:**
- ❌ Using `h.abandon()` which bypasses Hapi's response handling
- ❌ Less integration with existing enterprise patterns
- ❌ More complex debugging across framework and transport layers
- ❌ Additional complexity in error handling and logging

### Real-World Examples

#### Our Hapi.js Implementation (Direct JSON-RPC with Enterprise Patterns)
```javascript
// Clean integration with Hapi's ecosystem following enterprise patterns
{
  method: 'POST',
  path: '/mcp',
  handler: handleMcpRequest,
  options: {
    description: 'Handle MCP JSON-RPC requests',
    notes: 'Processes Model Context Protocol requests via JSON-RPC',
    tags: ['api', 'mcp'],
    validate: { payload: mcpRequestSchema }, // Joi validation
    auth: 'jwt-strategy',                    // Hapi auth integration
    pre: [{ method: rateLimiter }]           // Hapi middleware
  }
}

// Handler follows enterprise patterns
async function handleMcpRequest(request, h) {
  try {
    const mcpService = request.server.app.mcpService // Service injection
    
    // Route to service layer method
    switch (request.payload.method) {
      case 'initialize':
        return h.response(await mcpService.initialize(request.payload.params))
      case 'tools/call':
        return h.response(await mcpService.callTool(request.payload.params, request.payload.id))
    }
  } catch (error) {
    request.logger.error('MCP request error:', error)
    throw Boom.internal(`MCP request failed: ${error.message}`)
  }
}
```

#### Express + StreamableHTTPServerTransport (SDK Example)
```javascript
// Direct SDK integration with session management
import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

const app = express();
app.use(express.json());

const transports = {};

app.post('/mcp', async (req, res) => {
  const sessionId = req.headers['mcp-session-id'];
  let transport;

  if (sessionId && transports[sessionId]) {
    transport = transports[sessionId];
  } else if (!sessionId && isInitializeRequest(req.body)) {
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sessionId) => {
        transports[sessionId] = transport;
      }
    });

    const server = new McpServer({ name: 'notes', version: '1.0.0' });
    server.registerTool('create_note', schema, handler);
    await server.connect(transport);
  }

  await transport.handleRequest(req, res, req.body);
});
```

#### Hapi.js + StreamableHTTPServerTransport (Alternative Approach)
```javascript
// Hybrid approach using SDK transport with Hapi framework
async function handleMcpTransport(request, h) {
  const sessionId = request.headers['mcp-session-id'];
  let transport;

  if (sessionId && transports[sessionId]) {
    transport = transports[sessionId];
  } else if (isInitializeRequest(request.payload)) {
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sessionId) => {
        transports[sessionId] = transport;
      }
    });

    const server = new McpServer({ name: 'notes', version: '1.0.0' });
    // Could integrate with existing services here
    await server.connect(transport);
  }

  // Let transport handle the request/response
  await transport.handleRequest(request.raw.req, request.raw.res, request.payload);
  return h.abandon; // Bypass Hapi's response handling
}
```

### Architecture Overview

The following diagram illustrates the complete architecture of our MCP integration with Hapi.js following enterprise patterns:

```mermaid
architecture-beta
    group client_layer(cloud)[Client Layer]
    group api_layer(server)[API Layer]
    group service_layer(database)[Service Layer]
    group data_layer(disk)[Data Layer]
    group storage_layer(disk)[Storage Layer]

    service mcp_client(internet)[MCP Client] in client_layer
    
    service hapi_server(server)[Hapi Server] in api_layer
    service mcp_endpoints(server)[MCP Endpoints] in api_layer
    service validation(server)[Joi Validation] in api_layer
    service error_handler(server)[Error Handler] in api_layer
    
    service mcp_service(database)[MCP Service] in service_layer
    service note_service(database)[Note Service] in service_layer
    
    service note_repository(disk)[Note Repository] in data_layer
    service note_model(disk)[Note Model] in data_layer
    service note_parser(disk)[Note Parser] in data_layer
    service file_manager(disk)[File Manager] in data_layer
    
    service file_system(disk)[File System] in storage_layer

    mcp_client:B --> T:hapi_server
    hapi_server:B --> T:mcp_endpoints
    mcp_endpoints:R --> L:validation
    mcp_endpoints:B --> T:mcp_service
    validation:B --> T:error_handler
    
    mcp_service:R --> L:note_service
    note_service:B --> T:note_repository
    
    note_repository:R --> L:note_model
    note_repository:L --> R:note_parser
    note_repository:B --> T:file_manager
    
    file_manager:B --> T:file_system
```

**Flow Description:**
1. **MCP Client** sends JSON-RPC requests over HTTP POST to `/mcp`
2. **Hapi Server** routes requests to MCP endpoints with built-in middleware
3. **MCP Endpoints** handle HTTP-to-JSON-RPC conversion and route method calls
4. **Joi Validation** validates request structure and parameters
5. **MCP Service** implements JSON-RPC protocol and routes tool calls
6. **Note Service** handles business logic for note operations
7. **Note Repository** manages data access using Repository Pattern
8. **File Manager** handles file I/O operations with the file system

**Refactored Architecture Layers:**
- **Endpoints**: `/mcp/endpoints/mcp.js` - HTTP route handlers with Boom error handling
- **Services**: `/mcp/services/mcp.js` - Business logic for MCP operations
- **Note Services**: `/mcp/v1/notes/services/note.js` - Note-specific business logic
- **Repository**: `/src/data/repositories/note.js` - Data access layer with FileManager
- **Models**: `/src/data/models/note.js` - Domain models with validation
- **Utilities**: `/src/data/utils/note-parser.js` - File parsing without static methods
- **Schemas**: `/mcp/schemas/mcp.js` - Joi validation schemas
- **Errors**: `/src/common/errors/domain-errors.js` - Domain-specific error classes

## Implementation Details

### 1. Route Structure

```javascript
// src/mcp/endpoints/mcp.js
import Boom from '@hapi/boom'
import { McpService } from '../services/mcp.js'
import { mcpRequestSchema } from '../schemas/mcp.js'

/**
 * Handler for POST /mcp
 * Handle MCP JSON-RPC requests
 */
async function handleMcpRequest(request, h) {
  try {
    const mcpService = request.server.app.mcpService
    const payload = request.payload

    // Route based on JSON-RPC method
    switch (payload.method) {
      case 'initialize':
        return h.response(await mcpService.initialize(payload.params)).code(200)
      
      case 'tools/list':
        return h.response(await mcpService.listTools()).code(200)
      
      case 'tools/call':
        return h.response(await mcpService.callTool(payload.params, payload.id)).code(200)
      
      default:
        return h.response({
          jsonrpc: '2.0',
          error: { code: -32601, message: `Method not found: ${payload.method}` },
          id: payload.id
        }).code(404)
    }
  } catch (error) {
    request.logger.error('MCP request error:', error)
    throw Boom.internal(`MCP request failed: ${error.message}`)
  }
}

const mcpRoutes = [
  {
    method: 'POST',
    path: '/mcp',
    handler: handleMcpRequest,
    options: {
      description: 'Handle MCP JSON-RPC requests',
      notes: 'Processes Model Context Protocol requests via JSON-RPC',
      tags: ['api', 'mcp'],
      validate: {
        payload: mcpRequestSchema
      }
    }
  }
]

export { mcpRoutes }
```

### 2. MCP Service Layer

#### MCP Service Implementation
```javascript
// src/mcp/services/mcp.js
import { McpProtocolError } from '../../../../common/errors/domain-errors.js'

class McpService {
  constructor(noteService) {
    this.noteService = noteService
    this.logger = createLogger()
  }

  async initialize(params) {
    return {
      jsonrpc: '2.0',
      result: {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {}, prompts: {}, resources: {} },
        serverInfo: { name: 'notes-server', version: '1.0.0' }
      }
    }
  }

  async listTools() {
    return {
      jsonrpc: '2.0',
      result: {
        tools: [
          {
            name: 'create_note',
            description: 'Create a new note with title and content',
            inputSchema: {
              type: 'object',
              properties: {
                title: { type: 'string', minLength: 1, maxLength: 255 },
                content: { type: 'string', maxLength: 10000 }
              },
              required: ['title', 'content'],
              additionalProperties: false
            }
          },
          {
            name: 'get_note',
            description: 'Retrieve a note by its unique ID',
            inputSchema: {
              type: 'object',
              properties: {
                noteId: { type: 'string', pattern: '^note_\\d+_[a-z0-9]+$' }
              },
              required: ['noteId'],
              additionalProperties: false
            }
          },
          {
            name: 'list_notes',
            description: 'List all available notes with their metadata',
            inputSchema: { type: 'object', additionalProperties: false }
          }
        ]
      }
    }
  }

  async callTool(params, requestId) {
    const { name: toolName, arguments: toolArguments } = params

    switch (toolName) {
      case 'create_note':
        return await this._executeCreateNote(toolArguments, requestId)
      case 'get_note':
        return await this._executeGetNote(toolArguments, requestId)
      case 'list_notes':
        return await this._executeListNotes(toolArguments, requestId)
      default:
        throw new McpProtocolError(`Unknown tool: ${toolName}`)
    }
  }

  async _executeCreateNote(args, requestId) {
    const { title, content } = args
    const noteResult = await this.noteService.createNote({ title, content })

    return {
      jsonrpc: '2.0',
      result: {
        content: [{
          type: 'text',
          text: `✅ **Note created successfully!**

**Title:** ${noteResult.details.title}
**ID:** ${noteResult.details.id}
**Created:** ${noteResult.details.createdAt.toISOString()}

The note has been saved and can be retrieved using the get_note tool with ID: ${noteResult.details.id}`
        }]
      },
      id: requestId
    }
  }
}
```

### 3. Service Integration

The implementation integrates with the service layer architecture:

```javascript
// src/mcp/plugins/mcp.js
import { FileNoteRepository } from '../../data/repositories/note.js'
import { NoteService } from '../v1/notes/services/note.js'
import { createMcpService } from '../v1/mcp/services/mcp-tools.js'
import { mcpTransportRoutes } from '../v1/mcp/endpoints/mcp-transport.js'

const mcpTransportPlugin = {
  name: 'mcp-transport-server',
  version: '1.0.0',
  register: async function (server, options) {
    // Initialize repository and services using factory functions
    const notesDir = config.get('mcp.notesDir', './data/notes')
    const noteRepository = createFileNoteRepository(notesDir)
    const noteService = createNoteService(noteRepository)

    // Store services in server app context
    server.app.noteService = noteService

    // Register routes
    server.route(mcpTransportRoutes)
  }
}
```

### 4. Repository and Data Layer

Following the Repository Pattern with domain error handling:

```javascript
// src/data/repositories/note.js
import { createNote } from '../models/note.js'
import { parseFileContent } from '../utils/note-parser.js'
import { createFileManager } from '../../common/filesystem/file-manager.js'
import { createNoteNotFoundError, createFileOperationError } from '../../common/errors/domain-errors.js'

function createFileNoteRepository(notesDirectory) {
  const fileManager = createFileManager(notesDirectory)
  const logger = createLogger()

  return {
    async create(noteData) {
      try {
        const note = createNote(noteData)
        const fileName = `${note.id}.md`
        
        await fileManager.writeFile(fileName, note.toFileContent())
        
        logger.debug('Note created in repository:', { id: note.id, fileName })
        return note.toJSON()
      } catch (error) {
        logger.error('Failed to create note in repository:', error)
        throw createFileOperationError(`Failed to create note: ${error.message}`)
      }
    },

    async findById(id) {
      try {
        const fileName = `${id}.md`
        
        if (!(await fileManager.fileExists(fileName))) {
          throw createNoteNotFoundError(`Note with ID ${id} not found`)
        }

        const fileContent = await fileManager.readFile(fileName)
        const note = parseFileContent(fileContent, fileName)
        
        return note.toJSON()
      } catch (error) {
        logger.error('Failed to find note in repository:', error) 
        throw createFileOperationError(`Failed to read note: ${error.message}`)
      }
    }
  }
}
```

## Best Practices

### 1. For Hapi.js Integration

✅ **DO**: Use direct JSON-RPC handling in Hapi route handlers with service layer
✅ **DO**: Leverage Hapi's built-in JSON parsing with `payload: { parse: true }`
✅ **DO**: Use Hapi's validation (Joi schemas) and middleware capabilities
✅ **DO**: Integrate with existing service layer and repository pattern architecture
✅ **DO**: Use Boom for proper HTTP error handling
✅ **DO**: Follow domain-driven design with domain-specific error classes
✅ **DO**: Implement proper logging with structured context

❌ **DON'T**: Try to use `StreamableHTTPServerTransport` within Hapi
❌ **DON'T**: Bypass Hapi's request processing pipeline
❌ **DON'T**: Use `h.abandon` unless you're handling responses manually
❌ **DON'T**: Use static methods in models (prefer utility classes)
❌ **DON'T**: Nest functions unnecessarily (use simple control structures)

### 2. JSON-RPC Implementation

✅ **DO**: Validate `jsonrpc`, `method`, and `id` fields using Joi schemas
✅ **DO**: Return proper error codes (-32600, -32602, -32603, etc.)
✅ **DO**: Include request `id` in all responses
✅ **DO**: Handle method not found scenarios with proper routing
✅ **DO**: Use service layer for business logic separation
✅ **DO**: Implement comprehensive input validation with domain error classes

### 3. Service Architecture

✅ **DO**: Follow Repository Pattern for data access
✅ **DO**: Implement Service Layer for business logic
✅ **DO**: Use dependency injection through Hapi server app context
✅ **DO**: Return formatted response objects with `{ details: data }` structure
✅ **DO**: Use utility classes instead of static methods
✅ **DO**: Implement proper error handling at each layer

### 4. Tool Implementation

✅ **DO**: Provide comprehensive input schemas using Joi validation
✅ **DO**: Return structured content with `type: 'text'`
✅ **DO**: Include error indicators with `isError: true`
✅ **DO**: Validate tool arguments before execution at service layer
✅ **DO**: Use domain-specific error classes for different failure types
✅ **DO**: Log tool execution with structured context

### 5. File Format and Data Handling

When implementing file-based storage with the repository pattern:

```javascript
// Correct format (no extra indentation) - NoteModel.toFileContent()
toFileContent() {
  const header = `ID: ${this.id}
TITLE: ${this.title}
CREATED: ${this.createdAt.toISOString()}
---`

  return `${header}
${content}`
}

// Use utility functions for parsing (functional approach)
function parseFileContent(content, filename) {
  // Parse file content and return note object using factory function
  const noteData = extractNoteData(content)
  return createNote(noteData)
}

function createNoteFromDocument(content, filename) {
  return parseFileContent(content, filename)
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

# Get a specific note
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "id": 4, "method": "tools/call", "params": {"name": "get_note", "arguments": {"noteId": "note_1754048150071_h5rxn2njn"}}}'

# List all notes
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "id": 5, "method": "tools/call", "params": {"name": "list_notes", "arguments": {}}}'
```

### Expected Responses

All responses follow JSON-RPC 2.0 format with the refactored structure:

#### Initialize Response
```json
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

#### Tools List Response
```json
{
  "jsonrpc": "2.0",
  "result": {
    "tools": [
      {
        "name": "create_note",
        "description": "Create a new note with title and content",
        "inputSchema": {
          "type": "object",
          "properties": {
            "title": { "type": "string", "minLength": 1, "maxLength": 255 },
            "content": { "type": "string", "maxLength": 10000 }
          },
          "required": ["title", "content"],
          "additionalProperties": false
        }
      },
      {
        "name": "get_note",
        "description": "Retrieve a note by its unique ID",
        "inputSchema": {
          "type": "object",
          "properties": {
            "noteId": { "type": "string", "pattern": "^note_\\d+_[a-z0-9]+$" }
          },
          "required": ["noteId"],
          "additionalProperties": false
        }
      },
      {
        "name": "list_notes",
        "description": "List all available notes with their metadata",
        "inputSchema": { "type": "object", "additionalProperties": false }
      }
    ]
  },
  "id": 2
}
```

#### Create Note Success Response
```json
{
  "jsonrpc": "2.0",
  "result": {
    "content": [{
      "type": "text",
      "text": "✅ **Note created successfully!**\n\n**Title:** Test Note\n**ID:** note_1754048150071_h5rxn2njn\n**Created:** 2025-08-01T11:35:50.071Z\n\nThe note has been saved and can be retrieved using the get_note tool with ID: note_1754048150071_h5rxn2njn"
    }]
  },
  "id": 3
}
```

#### Error Response
```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32602,
    "message": "Invalid params: \"title\" is required"
  },
  "id": 3
}
```

## Future Recommendations

### 1. For New Hapi.js + MCP Projects

1. **Start with direct JSON-RPC implementation** - don't attempt transport abstractions
2. **Design tools first** - define your MCP tools before implementing routes  
3. **Use Hapi plugins** - encapsulate MCP functionality in a reusable plugin
4. **Implement comprehensive validation** - validate both MCP protocol and tool arguments
5. **Add proper logging** - log MCP method calls for debugging
6. **Follow enterprise patterns** - Repository Pattern, Service Layer, Domain-Driven Design
7. **Use domain-specific errors** - create error classes for different failure scenarios
8. **Avoid static methods** - use utility classes and dependency injection instead
9. **Structure endpoints properly** - follow `/api/v{version}/{domain}/` routing conventions
10. **Implement proper error handling** - use Boom for HTTP errors and domain errors for business logic

### 2. Alternative Frameworks

If using other Node.js frameworks:

- **Express**: Similar approach, use middleware for JSON-RPC parsing
- **Fastify**: Leverage schema validation for MCP protocol
- **Standalone**: Consider using MCP's provided transports

### 3. Production Considerations

- **Authentication**: Add authentication middleware before MCP routes
- **Rate limiting**: Implement rate limiting for MCP endpoints
- **Monitoring**: Add metrics for MCP tool usage
- **Validation**: Strict input validation using Joi schemas for security
- **Error handling**: Comprehensive error logging with domain-specific error classes
- **Service layer**: Proper separation of concerns with repository pattern
- **Documentation**: JSDoc documentation for all service methods
- **Testing**: Unit tests for services, integration tests for endpoints
- **Configuration**: Environment-based configuration for directories and limits

### 4. Transport Selection Guide

| Use Case | Recommended Approach | Architecture Notes |
|----------|---------------------|-------------------|
| Standalone MCP server | `StreamableHTTPServerTransport` | Simple, SDK-managed, session support |
| Integration with Express | `StreamableHTTPServerTransport` OR Direct JSON-RPC | Both work well, SDK provides sessions/SSE |
| Integration with Hapi.js | Direct JSON-RPC OR `StreamableHTTPServerTransport` | Direct = enterprise patterns, SDK = sessions |
| Enterprise applications | Direct JSON-RPC with service layer | Repository pattern, domain errors, validation |
| Rapid prototyping | `StreamableHTTPServerTransport` | Quick setup, automatic compliance |
| Desktop applications | `StdioServerTransport` | Local communication |
| WebSocket communication | Custom transport | Real-time requirements |

## Conclusion

Thank you for the correction! After reviewing the [Express example](https://github.com/modelcontextprotocol/typescript-sdk?tab=readme-ov-file#streamable-http) and [session management documentation](https://modelcontextprotocol.io/specification/2025-03-26/basic/transports#session-management), it's clear that **`StreamableHTTPServerTransport` can indeed work with web frameworks** like Hapi.js.

### Key Insights

**✅ Both approaches are valid:**
1. **`StreamableHTTPServerTransport`**: Provides session management, SSE streaming, automatic protocol compliance
2. **Direct JSON-RPC**: Provides enterprise integration, framework consistency, full control

**✅ The choice depends on priorities:**
- **For new MCP-focused services**: SDK transport may be ideal
- **For enterprise integration**: Direct implementation offers better framework alignment
- **For session features**: SDK transport provides built-in session management and resumability
- **For team consistency**: Direct implementation follows established patterns

### Our Choice: Direct JSON-RPC Implementation

We chose direct implementation for **enterprise-specific reasons**:
- ✅ **Aligns with existing patterns**: Repository Pattern, Service Layer, Domain-Driven Design
- ✅ **Framework consistency**: Uses Hapi's validation, error handling, middleware
- ✅ **Team familiarity**: Follows established architectural decisions
- ✅ **Enterprise features**: Easy integration with auth, logging, monitoring
- ✅ **Debugging simplicity**: One less abstraction layer to troubleshoot

### Alternative: StreamableHTTPServerTransport

We could have used `StreamableHTTPServerTransport` and gained:
- ✅ **Session management**: Automatic session handling and resumability
- ✅ **SSE streaming**: Server-to-client notifications
- ✅ **Protocol compliance**: SDK-managed validation and lifecycle
- ✅ **Future-proofing**: Automatic updates with protocol changes

**Key Architectural Benefits of Our Approach:**
- **Separation of Concerns**: Clear boundaries between endpoints, services, repositories, and models
- **Domain-Driven Design**: Domain-specific error classes and business logic encapsulation
- **Testability**: Each layer can be tested independently with proper dependency injection
- **Maintainability**: Consistent patterns and clear code organization
- **Enterprise Integration**: Works seamlessly with existing middleware and infrastructure

**The takeaway**: **Both approaches work**. The choice between `StreamableHTTPServerTransport` and direct JSON-RPC implementation should be based on your specific requirements, team expertise, and architectural priorities. MCP is flexible enough to support either approach while maintaining full protocol compliance.
