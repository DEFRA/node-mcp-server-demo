# Documentation Index

## Overview

This directory contains comprehensive documentation for the MCP-enabled Node.js server implementation. The documentation is organized into focused documents that cover different aspects of the system.

## Documentation Structure

### 📋 [MCP Implementation Overview](./mcp-implementation-overview.md)
**Primary Document** - Start here for a complete understanding of the MCP integration.

**Contents**:
- What is MCP and why it's used
- Overall architecture and component relationships  
- Key benefits and design decisions
- MCP-only protocol approach

**Audience**: Technical leads, architects, new team members

---

### 🏗️ [MCP Architecture](./mcp-architecture.md)
**Architectural Deep Dive** - Understanding the MCP protocol design.

**Contents**:
- Why MCP protocol is used
- Detailed protocol overview
- Shared business logic architecture
- Protocol-specific validation and session management

**Audience**: Developers, solution architects

---

### 🔧 [Technical Deep Dive](./technical-deep-dive.md)
**Implementation Details** - For developers working with the codebase.

**Contents**:
- Key component implementations
- Critical issues resolved during development
- Technical challenges and solutions
- Performance implications and considerations

**Audience**: Senior developers, maintainers

---

### 🚀 [Production Deployment](./production-deployment.md)
**Operations Guide** - Moving from local development to production.

**Contents**:
- Required configuration changes for production
- Security hardening requirements
- Infrastructure and scaling considerations
- Deployment checklist and monitoring setup

**Audience**: DevOps engineers, system administrators

---

### 🧪 [Testing Guide](./testing-guide.md)
**QA and Validation** - Comprehensive testing instructions.

**Contents**:
- Complete cURL-based test suite
- MCP protocol testing procedures
- Performance and load testing scripts

**Audience**: QA engineers, developers, support teams

---

## Quick Start

1. **For New Developers**: Start with [MCP Implementation Overview](./mcp-implementation-overview.md)
2. **For Testing**: Jump to [Testing Guide](./testing-guide.md)
3. **For Production**: Review [Production Deployment](./production-deployment.md)
4. **For Architecture Understanding**: Read [MCP Architecture](./mcp-architecture.md)
5. **For Implementation Details**: See [Technical Deep Dive](./technical-deep-dive.md)

## Key Concepts Reference

### MCP (Model Context Protocol)
- Standardized protocol for AI assistant tool integration
- Session-based communication with streaming support
- Zod schema validation for tool inputs
- Server-Sent Events for real-time updates

### MCP-Only Protocol Support
- **MCP Endpoints**: `/mcp/v1/mcp` (transport layer)
- Shared business logic and data layer
- Protocol-specific validation (Zod)

### Core Components
- **StreamableHTTPServerTransport**: MCP SDK integration
- **Session Management**: Stateful MCP connections
- **Tool Registration**: Available AI functions
- **FileManager**: Note storage abstraction

## Development Workflow

1. **Local Setup**:
   ```bash
   docker-compose up -d
   ```

2. **Test MCP Protocol**:
   ```bash
   curl -X POST http://localhost:3000/mcp/v1/mcp \
     -H "Content-Type: application/json" \
     -d '{"method": "initialize", "params": {...}}'
   ```

## API Endpoints Summary

### MCP Transport
- `POST /mcp/v1/mcp` - Main MCP protocol endpoint
- `GET /mcp/v1/mcp/{sessionId}` - SSE streaming
- `DELETE /mcp/v1/mcp/{sessionId}` - Session cleanup

### Health & Monitoring
- `GET /health` - Health check endpoint
- `GET /health/readiness` - Readiness probe
- `GET /health/liveness` - Liveness probe

## Contributing

When adding new documentation:

1. **Follow the existing structure** with clear headings and sections
2. **Include code examples** for technical concepts
3. **Add cross-references** to related documents
4. **Update this index** with new documents
5. **Test all code examples** to ensure they work

## Troubleshooting

### Common Issues

**"keyValidator._parse is not a function"**
- Solution: Use Zod schemas directly, not JSON Schema format
- Reference: [Technical Deep Dive - Issue 1](./technical-deep-dive.md#issue-1-tool-validation-failure)

**"No notes found" despite files existing**
- Solution: Check file extensions (.md vs .txt)
- Reference: [Technical Deep Dive - Issue 2](./technical-deep-dive.md#issue-2-file-discovery-failure)

**Session not persisting**
- Solution: Verify session ID header handling
- Reference: [Technical Deep Dive - Issue 3](./technical-deep-dive.md#issue-3-session-state-management)

### Getting Help

1. Check the relevant documentation section
2. Review the [Testing Guide](./testing-guide.md) for validation steps
3. Examine the [Technical Deep Dive](./technical-deep-dive.md) for implementation details
4. For production issues, see [Production Deployment](./production-deployment.md)

---

*Last updated: August 2025*
*Documentation version: 1.1*
