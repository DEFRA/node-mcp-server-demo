# MCP Server Integration Plan for Notes Management

## 📋 Overview

This document outlines the plan to integrate a Model Context Protocol (MCP) server for note management with MongoDB into the existing Node.js/Hapi.js project. The server will provide CRUD operations for notes through MCP tools, resources, and prompts.

## 🏗️ Integration Approaches

### Option 1: Separate Process (Recommended for Standard MCP)
**Architecture:**
```
┌─────────────────┐    ┌─────────────────┐
│   Hapi Server   │    │   MCP Server    │
│   (Port 3000)   │    │ (stdio/Port 3001)│
│                 │    │                 │
│  ┌───────────┐  │    │  ┌───────────┐  │
│  │    API    │  │    │  │MCP Tools/ │  │
│  │Endpoints  │  │    │  │Resources  │  │
│  └───────────┘  │    │  └───────────┘  │
└─────────┬───────┘    └─────────┬───────┘
          │                      │
          └──────────┬───────────┘
                     │
              ┌─────────────┐
              │  MongoDB    │
              │ (Shared DB) │
              └─────────────┘
```

**Benefits:**
- Follows MCP protocol design patterns
- Supports both stdio and HTTP transports
- Clean separation of concerns
- Independent testing and deployment
- Standard MCP implementation

### Option 2: Integrated within Hapi (Alternative)
**Architecture:**
```
┌─────────────────────────────────┐
│         Hapi Server             │
│         (Port 3000)             │
│                                 │
│  ┌───────────┐ ┌─────────────┐  │
│  │    API    │ │ MCP Plugin  │  │
│  │Endpoints  │ │ (/mcp route)│  │
│  └───────────┘ └─────────────┘  │
└─────────────────┬───────────────┘
                  │
           ┌─────────────┐
           │  MongoDB    │
           └─────────────┘
```

**Benefits:**
- Single application process
- Leverages Hapi's routing and middleware
- Integrated logging and configuration
- Simpler deployment model

## 📝 Detailed Implementation Plan

### Phase 1: Dependencies and Configuration

**1. Install MCP SDK Dependencies**
```bash
npm install @modelcontextprotocol/sdk zod
```

**2. Add MCP Configuration**
Extend `src/config/server.js`:

```javascript
mcp: {
  enabled: {
    doc: 'Enable MCP server',
    format: Boolean,
    default: true,
    env: 'MCP_ENABLED'
  },
  transport: {
    doc: 'MCP transport type (stdio|http)',
    format: ['stdio', 'http'],
    default: 'stdio',
    env: 'MCP_TRANSPORT'
  },
  port: {
    doc: 'MCP HTTP server port',
    format: 'port',
    default: 3001,
    env: 'MCP_PORT'
  }
}
```

### Phase 2: Database Layer

**1. MongoDB Connection**
`src/common/database/mongo.js`:
```javascript
import { MongoClient } from 'mongodb'
import { config } from '../../config/index.js'
import { createLogger } from '../logging/logger.js'

let mongoClient

async function connectMongo() {
  if (mongoClient) return mongoClient
  
  const logger = createLogger()
  
  try {
    mongoClient = new MongoClient(config.get('mongo.uri'))
    await mongoClient.connect()
    logger.info('MongoDB connected successfully')
    return mongoClient.db(config.get('mongo.databaseName'))
  } catch (error) {
    logger.error('MongoDB connection failed:', error)
    throw error
  }
}

export { connectMongo, mongoClient }
```

**2. Notes Data Model**
`src/data/mongo/models/note.js`:
```javascript
class NoteModel {
  constructor(data = {}) {
    this._id = data._id || data.id || null
    this.title = data.title || ''
    this.content = data.content || ''
    this.tags = data.tags || []
    this.createdAt = data.createdAt || new Date()
    this.updatedAt = data.updatedAt || new Date()
  }

  static fromDocument(doc) {
    return new NoteModel(doc)
  }

  toDocument() {
    return {
      _id: this._id,
      title: this.title,
      content: this.content,
      tags: this.tags,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    }
  }
}

export { NoteModel }
```

**3. Notes Repository**
`src/data/mongo/repositories/note.js`:
```javascript
import { ObjectId } from 'mongodb'
import { NoteModel } from '../models/note.js'

class MongoNoteRepository {
  constructor(db) {
    this.collection = db.collection('notes')
  }

  async create(noteData) {
    try {
      const note = new NoteModel(noteData)
      const result = await this.collection.insertOne(note.toDocument())
      return NoteModel.fromDocument({
        ...note.toDocument(),
        _id: result.insertedId
      })
    } catch (error) {
      throw error
    }
  }

  async findById(id) {
    const document = await this.collection.findOne({ _id: new ObjectId(id) })
    return document ? NoteModel.fromDocument(document) : null
  }

  async findAll(filters = {}) {
    const query = {}
    if (filters.tags) {
      query.tags = { $in: filters.tags }
    }
    if (filters.search) {
      query.$text = { $search: filters.search }
    }
    
    const documents = await this.collection.find(query).toArray()
    return documents.map(doc => NoteModel.fromDocument(doc))
  }

  async update(id, updateData) {
    const updateDoc = { ...updateData, updatedAt: new Date() }
    const result = await this.collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateDoc },
      { returnDocument: 'after' }
    )
    return result.value ? NoteModel.fromDocument(result.value) : null
  }

  async delete(id) {
    const result = await this.collection.deleteOne({ _id: new ObjectId(id) })
    return result.deletedCount > 0
  }
}

export { MongoNoteRepository }
```

### Phase 3: Service Layer

**Notes Service**
`src/api/v1/notes/services/note.js`:
```javascript
class NoteService {
  constructor(noteRepository) {
    this.noteRepository = noteRepository
  }

  async createNote({ title, content, tags = [] }) {
    const note = await this.noteRepository.create({
      title,
      content,
      tags
    })
    return {
      id: note._id.toString(),
      title: note.title,
      content: note.content,
      tags: note.tags,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt
    }
  }

  async getNoteById(id) {
    const note = await this.noteRepository.findById(id)
    if (!note) return null
    
    return {
      id: note._id.toString(),
      title: note.title,
      content: note.content,
      tags: note.tags,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt
    }
  }

  async getAllNotes(filters = {}) {
    const notes = await this.noteRepository.findAll(filters)
    return notes.map(note => ({
      id: note._id.toString(),
      title: note.title,
      content: note.content,
      tags: note.tags,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt
    }))
  }

  async updateNote(id, updateData) {
    const note = await this.noteRepository.update(id, updateData)
    if (!note) return null
    
    return {
      id: note._id.toString(),
      title: note.title,
      content: note.content,
      tags: note.tags,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt
    }
  }

  async deleteNote(id) {
    return await this.noteRepository.delete(id)
  }
}

export { NoteService }
```

### Phase 4: MCP Server Implementation

#### Option A: Separate Process Implementation

**Core MCP Server**
`src/mcp/server.js`:
```javascript
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { connectMongo } from '../common/database/mongo.js'
import { MongoNoteRepository } from '../data/mongo/repositories/note.js'
import { NoteService } from '../api/v1/notes/services/note.js'
import { createLogger } from '../common/logging/logger.js'

class NotesMcpServer {
  constructor() {
    this.server = new McpServer({
      name: 'notes-server',
      version: '1.0.0'
    })
    this.logger = createLogger()
    this.setupToolsAndResources()
  }

  async initialize() {
    this.db = await connectMongo()
    this.noteRepository = new MongoNoteRepository(this.db)
    this.noteService = new NoteService(this.noteRepository)
  }

  setupToolsAndResources() {
    // Tool: Create Note
    this.server.registerTool(
      'create-note',
      {
        title: 'Create Note',
        description: 'Create a new note with title, content, and tags',
        inputSchema: {
          title: z.string().min(1).max(200),
          content: z.string().min(1),
          tags: z.array(z.string()).optional().default([])
        }
      },
      async ({ title, content, tags }) => {
        try {
          const note = await this.noteService.createNote({ title, content, tags })
          return {
            content: [{
              type: 'text',
              text: `Note created successfully:\nID: ${note.id}\nTitle: ${note.title}\nTags: ${note.tags.join(', ')}`
            }]
          }
        } catch (error) {
          this.logger.error('Error creating note:', error)
          return {
            content: [{
              type: 'text',
              text: `Error creating note: ${error.message}`
            }],
            isError: true
          }
        }
      }
    )

    // Additional tools (update, delete, search) would go here...

    // Resource: Individual Note
    this.server.registerResource(
      'note',
      new ResourceTemplate('note://{id}', { list: undefined }),
      {
        title: 'Note Resource',
        description: 'Access individual notes by ID'
      },
      async (uri, { id }) => {
        try {
          const note = await this.noteService.getNoteById(id)
          if (!note) {
            throw new Error(`Note with ID ${id} not found`)
          }

          return {
            contents: [{
              uri: uri.href,
              mimeType: 'text/markdown',
              text: `# ${note.title}\n\n${note.content}\n\n**Tags:** ${note.tags.join(', ')}`
            }]
          }
        } catch (error) {
          this.logger.error('Error fetching note resource:', error)
          throw error
        }
      }
    )

    // Prompt: Note Template
    this.server.registerPrompt(
      'note-template',
      {
        title: 'Note Template',
        description: 'Generate a structured note template',
        argsSchema: {
          topic: z.string(),
          type: z.enum(['meeting', 'research', 'todo', 'idea']).default('idea')
        }
      },
      ({ topic, type }) => {
        const templates = {
          meeting: `# ${topic} Meeting Notes\n\n## Attendees\n\n## Agenda\n\n## Discussion\n\n## Action Items\n`,
          research: `# ${topic} Research\n\n## Objective\n\n## Key Findings\n\n## Sources\n\n## Conclusions\n`,
          todo: `# ${topic} Todo List\n\n## High Priority\n\n## Medium Priority\n\n## Low Priority\n`,
          idea: `# ${topic}\n\n## Core Concept\n\n## Key Benefits\n\n## Implementation Ideas\n`
        }

        return {
          messages: [{
            role: 'user',
            content: {
              type: 'text',
              text: `Please create a note with this template:\n\n${templates[type]}`
            }
          }]
        }
      }
    )
  }

  getServer() {
    return this.server
  }
}

export { NotesMcpServer }
```

**Transport Layer**
`src/mcp/transport.js`:
```javascript
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import express from 'express'
import { config } from '../config/index.js'
import { createLogger } from '../common/logging/logger.js'
import { NotesMcpServer } from './server.js'

let mcpServerInstance

async function startMcpServer() {
  const logger = createLogger()
  
  try {
    mcpServerInstance = new NotesMcpServer()
    await mcpServerInstance.initialize()
    
    const transportType = config.get('mcp.transport')
    
    if (transportType === 'stdio') {
      await startStdioTransport(mcpServerInstance)
    } else if (transportType === 'http') {
      await startHttpTransport(mcpServerInstance)
    }
    
    logger.info(`MCP server started successfully using ${transportType} transport`)
  } catch (error) {
    logger.error('Failed to start MCP server:', error)
    throw error
  }
}

async function startStdioTransport(mcpServer) {
  const transport = new StdioServerTransport()
  await mcpServer.getServer().connect(transport)
}

async function startHttpTransport(mcpServer) {
  const app = express()
  app.use(express.json())
  
  // Store transports by session ID
  const transports = {}
  
  app.post('/mcp', async (req, res) => {
    const sessionId = req.headers['mcp-session-id']
    let transport
    
    if (sessionId && transports[sessionId]) {
      transport = transports[sessionId]
    } else {
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => crypto.randomUUID(),
        onsessioninitialized: (sessionId) => {
          transports[sessionId] = transport
        }
      })
      
      transport.onclose = () => {
        if (transport.sessionId) {
          delete transports[transport.sessionId]
        }
      }
      
      await mcpServer.getServer().connect(transport)
    }
    
    await transport.handleRequest(req, res, req.body)
  })
  
  const port = config.get('mcp.port')
  app.listen(port)
}

export { startMcpServer }
```

#### Option B: Integrated Hapi Plugin Implementation

**MCP Hapi Plugin**
`src/api/plugins/mcp.js`:
```javascript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { z } from 'zod'
import { connectMongo } from '../../common/database/mongo.js'

const mcpPlugin = {
  name: 'mcp-server',
  version: '1.0.0',
  register: async function (server, options) {
    // Create MCP server instance
    const mcpServer = new McpServer({
      name: 'notes-server',
      version: '1.0.0'
    })

    // Initialize database connection
    const db = await connectMongo()

    // Set up basic MCP tools
    mcpServer.registerTool(
      'hello',
      {
        title: 'Hello World',
        description: 'Simple hello world tool',
        inputSchema: {
          name: z.string().optional().default('World')
        }
      },
      async ({ name }) => ({
        content: [{
          type: 'text',
          text: `Hello, ${name}!`
        }]
      })
    )

    // Store transports by session
    const transports = {}

    // Add MCP routes to Hapi
    server.route([
      {
        method: 'POST',
        path: '/mcp',
        handler: async (request, h) => {
          const sessionId = request.headers['mcp-session-id']
          let transport

          if (sessionId && transports[sessionId]) {
            transport = transports[sessionId]
          } else {
            transport = new StreamableHTTPServerTransport({
              sessionIdGenerator: () => crypto.randomUUID(),
              onsessioninitialized: (sessionId) => {
                transports[sessionId] = transport
              }
            })

            await mcpServer.connect(transport)
          }

          // Handle MCP request through Hapi
          const response = h.response()
          await transport.handleRequest(request.raw.req, response.raw, request.payload)
          return response
        }
      },
      {
        method: 'GET',
        path: '/mcp',
        handler: async (request, h) => {
          // Handle SSE for server-to-client notifications
          const sessionId = request.headers['mcp-session-id']
          if (!sessionId || !transports[sessionId]) {
            return h.response('Invalid session').code(400)
          }

          const transport = transports[sessionId]
          const response = h.response()
          await transport.handleRequest(request.raw.req, response.raw)
          return response
        }
      }
    ])

    server.log(['mcp'], 'MCP server plugin registered successfully')
  }
}

export { mcpPlugin }
```

### Phase 5: Integration with Main Application

**Update Main Server** (for separate process approach)
`src/api/server.js`:
```javascript
import { startMcpServer } from '../mcp/transport.js'

async function startServer () {
  let server

  try {
    server = await createServer()
    await server.start()

    // Start MCP server if enabled
    if (config.get('mcp.enabled')) {
      await startMcpServer()
    }

    server.logger.info('Server started successfully')
  } catch (error) {
    // error handling
  }
  return server
}
```

**Or for integrated approach:**
```javascript
import { mcpPlugin } from './plugins/mcp.js'

async function createServer () {
  const server = hapi.server({ /* config */ })

  await server.register([
    requestLogger,
    requestTracing,
    pulse,
    probesRouter,
    mcpPlugin // Add MCP as a Hapi plugin
  ])

  return server
}
```

## 🧪 Testing Strategy

### Unit Tests
- Test individual MCP tools
- Test repository methods
- Test service layer logic

### Integration Tests
- Test MCP server initialization
- Test database operations
- Test transport layer

### Example Test
`test/unit/mcp/server.test.js`:
```javascript
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { NotesMcpServer } from '../../../src/mcp/server.js'

vi.mock('../../../src/common/database/mongo.js')
vi.mock('../../../src/common/logging/logger.js')

describe('NotesMcpServer', () => {
  let mcpServer

  beforeEach(() => {
    mcpServer = new NotesMcpServer()
  })

  test('should initialize server with correct name and version', () => {
    const server = mcpServer.getServer()
    expect(server.serverInfo.name).toBe('notes-server')
    expect(server.serverInfo.version).toBe('1.0.0')
  })
})
```

## 🚀 Usage Examples

### Creating a Note via MCP Tool
```javascript
{
  "name": "create-note",
  "arguments": {
    "title": "Project Ideas",
    "content": "Ideas for new features...",
    "tags": ["project", "ideas", "features"]
  }
}
```

### Accessing Note as Resource
```javascript
{
  "uri": "note://64a1b2c3d4e5f6789abcdef0"
}
```

### Using Note Template Prompt
```javascript
{
  "name": "note-template",
  "arguments": {
    "topic": "Sprint Planning",
    "type": "meeting"
  }
}
```

## 📝 Development Scripts

Update `package.json`:
```json
{
  "scripts": {
    "mcp:stdio": "NODE_ENV=development MCP_TRANSPORT=stdio node src/index.js",
    "mcp:http": "NODE_ENV=development MCP_TRANSPORT=http node src/index.js",
    "mcp:integrated": "NODE_ENV=development MCP_ENABLED=true node src/index.js"
  }
}
```

## 🐳 Docker Configuration

Update `compose.yaml`:
```yaml
environment:
  MCP_ENABLED: true
  MCP_TRANSPORT: stdio
  MCP_PORT: 3001
```

## 📋 Implementation Checklist

### Phase 1: Setup
- [ ] Install MCP SDK dependencies
- [ ] Add configuration options
- [ ] Update environment variables

### Phase 2: Database
- [ ] Create MongoDB connection utility
- [ ] Implement Note model
- [ ] Create Note repository
- [ ] Add database indexes

### Phase 3: Services
- [ ] Implement Note service
- [ ] Add validation schemas
- [ ] Create error handling

### Phase 4: MCP Server
- [ ] Create basic MCP server
- [ ] Implement CRUD tools
- [ ] Add resource handlers
- [ ] Create prompt templates

### Phase 5: Integration
- [ ] Choose integration approach
- [ ] Update main server
- [ ] Add transport configuration
- [ ] Test connectivity

### Phase 6: Testing
- [ ] Unit tests for tools
- [ ] Integration tests
- [ ] End-to-end testing
- [ ] Performance testing

### Phase 7: Documentation
- [ ] API documentation
- [ ] Usage examples
- [ ] Deployment guide
- [ ] Troubleshooting guide

## 🔧 Configuration Options

### Environment Variables
- `MCP_ENABLED`: Enable/disable MCP server
- `MCP_TRANSPORT`: Transport type (stdio/http)
- `MCP_PORT`: HTTP port for MCP server
- `MONGO_URI`: MongoDB connection string
- `MONGO_DATABASE`: Database name

### MCP Tools Available
- **create-note**: Create new notes
- **update-note**: Update existing notes
- **delete-note**: Delete notes
- **search-notes**: Search notes by tags/content
- **list-notes**: List all notes

### MCP Resources Available
- **note://[id]**: Individual note content
- **notes://collection**: All notes collection
- **notes://tags**: Available tags list

### MCP Prompts Available
- **note-template**: Generate note templates
- **summarize-notes**: Summarize multiple notes
- **organize-notes**: Suggest note organization

## 🔍 Next Steps

1. Start with simple "hello world" MCP server
2. Choose integration approach (separate vs integrated)
3. Implement basic database layer
4. Add simple CRUD operations
5. Expand with advanced features
6. Add comprehensive testing
7. Deploy and monitor

This plan provides a comprehensive roadmap for implementing a full-featured MCP server for note management while maintaining consistency with the existing Hapi.js project structure and patterns.
