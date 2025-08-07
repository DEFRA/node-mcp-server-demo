# Node.js MCP Server Demo

A demonstration of integrating the **Model Context Protocol (MCP)** with a **Hapi.js** backend server. This project implements MCP tools for note management using file-based storage.

## What is MCP?

The Model Context Protocol (MCP) is an open standard for connecting AI assistants to external tools and data sources. This implementation provides a JSON-RPC interface that allows AI clients to create, read, and list notes through standardized tool calls.

## Features

- **Hapi.js Framework**: RESTful API with MCP SDK integration
- **Functional Architecture**: Pure functional programming with factory functions (no classes)
- **MCP SDK Transport**: Official StreamableHTTPServerTransport for protocol compliance
- **File-based Storage**: Notes stored as structured text files
- **Docker Support**: Containerized deployment with MongoDB
- **MCP Tools**:
  - `create_note`: Create new notes with title and content
  - `get_note`: Retrieve specific notes by ID
  - `list_notes`: List all available notes

## Table of Contents

- [Quick Start](#quick-start)
- [MCP Integration](#mcp-integration)
- [Requirements](#requirements)
- [Local Development](#local-development)
- [Testing](#testing)
- [Docker](#docker)
- [API Documentation](#api-documentation)
- [Troubleshooting](#troubleshooting)
- [License](#license)

## Quick Start

### 1. Start the Server

```bash
# Clone and navigate to the project
git clone <repository-url>
cd node-mcp-server-demo

# Start with Docker Compose (recommended)
docker compose up --build
```

The server will be available at:
- **API Server**: http://localhost:3000
- **MCP Endpoint**: http://localhost:3000/mcp
- **Health Check**: http://localhost:3000/health

> **🔒 Security Note**: The development configuration allows MCP inspector connections without strict origin validation to support testing tools. For production deployment, ensure `NODE_ENV=production` is set to enable proper DNS rebinding protection. See [Production Deployment](./docs/production-deployment.md) for security requirements.

### 2. Test with MCP Inspector (GUI)

The easiest way to interact with the MCP server:

```bash
# Install and run MCP Inspector
npx @modelcontextprotocol/inspector
```

1. Open the Inspector URL in your browser (typically http://localhost:6274/...)
2. Configure connection:
   - **Transport Type**: HTTP
   - **URL**: `http://localhost:3000/mcp`
3. Test the tools in the Inspector interface

### 3. Test with curl (Command Line)

You can also test the MCP server directly using curl commands:

#### Initialize the MCP Server
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
      "clientInfo": {
        "name": "test-client",
        "version": "1.0.0"
      }
    }
  }'
```

#### List Available Tools
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/list",
    "params": {}
  }'
```

#### Create a Note
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "create_note",
      "arguments": {
        "title": "My Test Note",
        "content": "This is a test note created via curl"
      }
    }
  }'
```

#### List All Notes
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 4,
    "method": "tools/call",
    "params": {
      "name": "list_notes",
      "arguments": {}
    }
  }'
```

#### Get a Specific Note
```bash
# Replace "your_note_id" with an actual note ID from list_notes
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 5,
    "method": "tools/call",
    "params": {
      "name": "get_note",
      "arguments": {
        "noteId": "your_note_id"
      }
    }
  }'
```

## MCP Integration

### Architecture Overview

This project implements MCP (Model Context Protocol) using functional programming patterns and the official MCP SDK:

```
MCP Client → HTTP POST /mcp → StreamableHTTPServerTransport → MCP Tools → Services → Repository → File System
```

**Key Architectural Components:**
- **Client Layer**: MCP clients (GUI Inspector, curl, AI assistants)
- **Transport Layer**: Official MCP SDK StreamableHTTPServerTransport for protocol handling
- **API Layer**: Hapi.js server with MCP transport integration and session management
- **Service Layer**: Business logic using factory functions for MCP operations and note management
- **Data Layer**: Repository pattern with factory functions for file-based storage
- **Storage Layer**: Structured text files in `data/notes/` directory

For a detailed visual representation of the architecture, see the [MCP Integration Guide](./MCP_INTEGRATION_GUIDE.md#architecture-overview).

### Project Structure

```
src/
├── mcp/
│   ├── plugins/
│   │   └── mcp-transport.js    # MCP transport plugin with StreamableHTTPServerTransport
│   ├── server.js               # Hapi server configuration
│   └── v1/
│       ├── common/
│       │   └── schemas/        # Common validation schemas
│       ├── mcp/
│       │   ├── endpoints/
│       │   │   └── mcp-transport.js  # MCP transport endpoint handlers
│       │   ├── services/
│       │   │   └── mcp-tools.js      # MCP tools registration and logic
│       │   └── schemas/        # MCP validation schemas
│       └── notes/
│           └── services/
│               └── note.js     # Note service factory functions
├── common/
│   ├── errors/
│   │   └── domain-errors.js    # Domain error factory functions
│   ├── filesystem/
│   │   └── file-manager.js     # File manager factory functions
│   └── logging/                # Logger utilities
├── data/
│   ├── models/
│   │   └── note.js             # Note model factory functions
│   ├── repositories/
│   │   └── note.js             # File-based note repository factory functions
│   └── utils/
│       └── note-parser.js      # File parsing utility functions
```

### File Storage Format

Notes are stored in the `data/notes/` directory with the following format:

```
ID: note_<timestamp>_<randomId>
TITLE: <note_title>
CREATED: <iso_timestamp>
---
<note_content>
```

### Implementation Details

This implementation demonstrates:

1. **Functional Architecture**: Pure functional programming with factory functions instead of classes
2. **MCP SDK Integration**: StreamableHTTPServerTransport for official MCP protocol support
3. **Factory Function Patterns**: All object creation through factory functions (createNoteService, createFileNoteRepository, etc.)
4. **Layered Architecture**: Clear separation between endpoints, services, repositories, and data models
5. **Domain Error Handling**: Factory-based error creation with proper HTTP status codes using Boom
6. **Validation**: Comprehensive Joi schemas for request validation
7. **Tool Registration**: Three MCP tools with proper schemas and business logic separation
8. **File-based Storage**: Repository pattern implementation with file-based note storage

### Architecture Layers

- **Endpoints** (`/mcp/endpoints/`): HTTP route handlers with Boom error handling using MCP SDK transport
- **Services** (`/mcp/services/` & `/mcp/v1/notes/services/`): Business logic layer with factory functions
- **Repository** (`/src/data/repositories/`): Data access layer with Repository Pattern using factory functions
- **Models** (`/src/data/models/`): Domain models with validation using factory functions
- **Utilities** (`/src/data/utils/`): File parsing and helper utility functions
- **Schemas** (`/mcp/schemas/`): Joi validation schemas
- **Errors** (`/src/common/errors/`): Domain-specific error factory functions

## Requirements

### Node.js

Please install [Node.js](http://nodejs.org/) `>= v22` and [npm](https://nodejs.org/) `>= v9`. You will find it
easier to use the Node Version Manager [nvm](https://github.com/creationix/nvm)

To use the correct version of Node.js for this application, via nvm:

```bash
cd node-mcp-server-demo
nvm use
```

## Local Development

### Setup

Create a `.env` file in the root of the project directory:

```bash
touch .env
```

Install application dependencies:

```bash
npm install
```

### Development

To run the application in `development` mode:

```bash
npm run dev
```

For development with file watching:

```bash
npm run start:watch
```

### Production

To mimic the application running in `production` mode locally:

```bash
npm start
```

## Testing

### Automated Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run linting
npm run test:lint

# Fix linting issues
npm run lint:fix
```

### Manual Testing

1. **Health Check**: `curl http://localhost:3000/health`
2. **MCP Inspector**: Use the GUI for interactive testing
3. **curl Commands**: Use the examples above for API testing

### Npm scripts

All available Npm scripts can be seen in [package.json](./package.json)
To view them in your command line run:

```bash
npm run
```

## Development helpers

### MongoDB Locks

If you require a write lock for Mongo you can acquire it via `server.locker` or `request.locker`:

```javascript
async function doStuff(server) {
  const lock = await server.locker.lock('unique-resource-name')

  if (!lock) {
    // Lock unavailable
    return
  }

  try {
    // do stuff
  } finally {
    await lock.free()
  }
}
```

Keep it small and atomic.

You may use **using** for the lock resource management.
Note test coverage reports do not like that syntax.

```javascript
async function doStuff(server) {
  await using lock = await server.locker.lock('unique-resource-name')

  if (!lock) {
    // Lock unavailable
    return
  }

  // do stuff

  // lock automatically released
}
```

Helper methods are also available in `/src/helpers/mongo-lock.js`.

## Docker

### Quick Start with Docker Compose

The easiest way to run the full application:

```bash
docker compose up --build
```

This starts:
- **Node.js Application**: Main MCP server on port 3000
- **MongoDB**: Database service
- **Persistent Storage**: Notes stored in `data/notes/` directory

### Development Image

Build:

```bash
docker build --target development --no-cache --tag node-mcp-server-demo:development .
```

Run:

```bash
docker run -e PORT=3000 -p 3000:3000 node-mcp-server-demo:development
```

### Production Image

Build:

```bash
docker build --no-cache --tag node-mcp-server-demo .
```

Run:

```bash
docker run -e PORT=3000 -p 3000:3000 node-mcp-server-demo
```

### Docker Compose

A local environment with:

- **Localstack** for AWS services (S3, SQS)
- **Redis**
- **MongoDB**
- **This MCP service**
- A commented out frontend example

```bash
docker compose up --build -d
```

## API Documentation

### MCP Endpoints

- `POST /mcp` - Main MCP JSON-RPC endpoint

### Health Endpoints

- `GET /health` - Health check
- `GET /health/live` - Liveness probe
- `GET /health/ready` - Readiness probe

### Environment Variables

- `NODE_ENV`: Environment (development/production) **⚠️ CRITICAL: Set to 'production' for security**
- `PORT`: Server port (default: 3000)
- `LOG_LEVEL`: Logging level (default: info)
- `MCP_ENABLED`: Enable MCP functionality (default: false)

## Troubleshooting

### Common Issues

1. **Port Already in Use**: Change the port in `docker-compose.yml` or stop conflicting services
2. **Permission Errors**: Ensure Docker has access to the project directory
3. **MCP Connection Failed**: Verify the server is running and accessible at `http://localhost:3000/mcp`

### Viewing Logs

View server logs with:
```bash
docker compose logs -f node-mcp-server-demo-development
```

### Debug Mode

Start with debug logging:
```bash
LOG_LEVEL=debug docker compose up --build
```

## License

THIS INFORMATION IS LICENSED UNDER THE CONDITIONS OF THE OPEN GOVERNMENT LICENCE found at:

<http://www.nationalarchives.gov.uk/doc/open-government-licence/version/3>

The following attribution statement MUST be cited in your products and applications when using this information.

> Contains public sector information licensed under the Open Government license v3

### About the license

The Open Government Licence (OGL) was developed by the Controller of Her Majesty's Stationery Office (HMSO) to enable
information providers in the public sector to license the use and re-use of their information under a common open
licence.

It is designed to encourage use and re-use of information freely and flexibly, with only a few conditions.

## Related Documentation

- [Model Context Protocol Specification](https://modelcontextprotocol.io/)
- [Hapi.js Documentation](https://hapi.dev/)
- [MCP Integration Guide](./MCP_INTEGRATION_GUIDE.md) - Detailed implementation guide

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm test`
5. Submit a pull request
