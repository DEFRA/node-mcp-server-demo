# MCP Implementation Overview

## Introduction

This document provides a comprehensive overview of how the Node.js MCP Server Demo has been updated to implement the Model Context Protocol (MCP) using the official MCP SDK and Hapi.js framework. The implementation provides a seamless integration between the MCP protocol and our existing REST API architecture.

## What is MCP?

The Model Context Protocol (MCP) is a standard for connecting AI assistants to external tools and data sources. It provides a secure, standardized way for AI models to interact with various services and resources through well-defined interfaces.

### Key MCP Concepts

- **Tools**: Functions that AI models can call to perform actions
- **Resources**: Data sources that AI models can read from
- **Prompts**: Reusable prompt templates
- **Sessions**: Stateful connections between clients and servers

## Architecture Overview

Our implementation follows a layered architecture that integrates MCP capabilities with our existing Hapi.js REST API:

```
┌─────────────────────────────────────────────────────────┐
│                   MCP Client                            │
│              (AI Assistant/Tool)                        │
└─────────────────────┬───────────────────────────────────┘
                      │ HTTP/SSE
                      │ MCP Protocol
┌─────────────────────▼───────────────────────────────────┐
│                Hapi.js Server                           │
│  ┌─────────────────────────────────────────────────────┐ │
│  │          MCP Transport Layer                        │ │
│  │    (StreamableHTTPServerTransport)                  │ │
│  └─────────────────────┬───────────────────────────────┘ │
│  ┌─────────────────────▼───────────────────────────────┐ │
│  │              MCP Tools Service                      │ │
│  │        (Tool Registration & Handlers)               │ │
│  └─────────────────────┬───────────────────────────────┘ │
│  ┌─────────────────────▼───────────────────────────────┐ │
│  │            Business Logic Layer                     │ │
│  │           (Note Service & Repository)               │ │
│  └─────────────────────┬───────────────────────────────┘ │
│  ┌─────────────────────▼───────────────────────────────┐ │
│  │             File System Layer                       │ │
│  │              (FileManager)                          │ │
│  └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## Key Components

### 1. MCP Transport Endpoints (`/src/api/v1/mcp/endpoints/mcp-transport.js`)

This is the core MCP integration point that implements the StreamableHTTPServerTransport from the official MCP SDK. It handles:

- **Session Management**: Creates and manages stateful MCP sessions
- **Protocol Communication**: Handles MCP protocol messages (initialize, tools/list, tools/call)
- **Server-Sent Events (SSE)**: Provides real-time streaming capabilities
- **Security**: Implements DNS rebinding protection and CORS

**Why separate from regular endpoints?**
- MCP requires specific protocol compliance and message formatting
- Transport layer needs session state management
- Streaming capabilities via SSE are MCP-specific requirements
- Security model differs from REST APIs

### 2. MCP Tools Service (`/src/api/v1/mcp/services/mcp-tools.js`)

Bridges the gap between MCP protocol and our business logic:

- **Tool Registration**: Registers available tools with the MCP server
- **Schema Validation**: Uses Zod schemas for input validation (MCP SDK requirement)
- **Business Logic Integration**: Connects MCP calls to existing services
- **Error Handling**: Translates application errors to MCP-compatible responses

### 3. Traditional REST Endpoints (`/src/api/v1/mcp/endpoints/mcp.js`)

Maintains backward compatibility and provides alternative access patterns:

- **HTTP REST API**: Traditional GET/POST endpoints
- **JSON Validation**: Uses Joi schemas for REST API validation
- **Documentation**: Swagger/OpenAPI compatible endpoints
- **Direct Access**: Allows non-MCP clients to use the same functionality

## Session Management

The MCP implementation uses a sophisticated session management system:

```javascript
// Session storage with automatic cleanup
const sessions = new Map()

// Session creation with unique ID
const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

// Session cleanup on disconnect
sessions.delete(sessionId)
```

### Session Lifecycle

1. **Initialize**: Client sends initialize request, server creates session
2. **Active**: Session handles tool calls and maintains state
3. **Cleanup**: Session automatically cleaned up on disconnect or timeout

## Security Implementation

### DNS Rebinding Protection

```javascript
const transport = new StreamableHTTPServerTransport({
  enableDnsRebindingProtection: true,
  allowedHosts: ['localhost', '127.0.0.1', 'node-mcp-server-demo-development']
})
```

**Purpose**: Prevents malicious websites from making requests to local services

### CORS Configuration

```javascript
cors: {
  origin: true,
  credentials: true,
  exposedHeaders: ['Mcp-Session-Id']
}
```

**Purpose**: Enables browser-based MCP clients while maintaining security

## Tool Implementation

### Schema Validation Approach

**MCP SDK Requirement**: Direct Zod schemas, not JSON Schema

```javascript
// Correct approach for MCP SDK
const createNoteInputSchema = {
  title: z.string().min(1).max(255),
  content: z.string().min(1)
}

// Incorrect approach (would cause validation errors)
const createNoteInputSchema = {
  type: "object",
  properties: {
    title: { type: "string", minLength: 1, maxLength: 255 }
  }
}
```

### Tool Registration

```javascript
mcpServer.registerTool('create_note', {
  description: 'Create a new note',
  inputSchema: createNoteInputSchema
}, async (args) => {
  // Business logic implementation
})
```

## Key Issues Overcome

### 1. Schema Validation Error

**Problem**: `keyValidator._parse is not a function`

**Root Cause**: Using JSON Schema format instead of Zod schemas

**Solution**: Convert all tool schemas to direct Zod schema objects

### 2. File Discovery Issue

**Problem**: `list_notes` tool returning "No notes found" despite files existing

**Root Cause**: FileManager hardcoded to filter only `.txt` files while notes stored as `.md`

**Solution**: Made FileManager.listFiles() accept extension parameter

### 3. Session Management

**Problem**: Stateful protocol requirements in stateless HTTP environment

**Solution**: Implemented in-memory session storage with automatic cleanup

### 4. Transport Integration

**Problem**: Integrating MCP SDK transport with existing Hapi.js server

**Solution**: Created plugin architecture that registers MCP routes alongside REST routes

## Benefits of This Architecture

### 1. **Dual Protocol Support**
- MCP clients can use the standardized protocol
- REST clients can use traditional HTTP endpoints
- Same business logic serves both interfaces

### 2. **Maintainability**
- Clear separation of concerns
- MCP-specific code isolated in transport layer
- Business logic remains protocol-agnostic

### 3. **Scalability**
- Session management can be moved to external store (Redis)
- Transport layer can be horizontally scaled
- Business logic scales independently

### 4. **Security**
- DNS rebinding protection prevents local network attacks
- CORS properly configured for browser clients
- Session isolation prevents cross-session data leaks

## Next Steps

This implementation provides a solid foundation for MCP integration. Future enhancements could include:

- Resource implementation for file browsing
- Prompt templates for common operations
- Enhanced error handling and logging
- Performance monitoring and metrics
- Authentication and authorization layers
