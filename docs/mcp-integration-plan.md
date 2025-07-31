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

/**
 * Connect to MongoDB and return database instance
 * @returns {Promise<Db>} MongoDB database instance
 */
async function connectMongo() {
  if (mongoClient) return mongoClient.db(config.get('mongo.databaseName'))
  
  const logger = createLogger()
  
  try {
    mongoClient = new MongoClient(config.get('mongo.uri'), {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000
    })
    await mongoClient.connect()
    logger.info('MongoDB connected successfully')
    return mongoClient.db(config.get('mongo.databaseName'))
  } catch (error) {
    logger.error('MongoDB connection failed:', error)
    // Clean up on connection failure
    if (mongoClient) {
      try {
        await mongoClient.close()
      } catch (closeError) {
        logger.error('Error closing MongoDB client:', closeError)
      }
      mongoClient = null
    }
    throw error
  }
}

/**
 * Close MongoDB connection
 */
async function closeMongo() {
  if (mongoClient) {
    const logger = createLogger()
    try {
      await mongoClient.close()
      logger.info('MongoDB connection closed')
    } catch (error) {
      logger.error('Error closing MongoDB connection:', error)
      throw error
    } finally {
      mongoClient = null
    }
  }
}

export { connectMongo, closeMongo, mongoClient }
```

**2. Notes Data Model**
`src/data/mongo/models/note.js`:
```javascript
import { createLogger } from '../../../common/logging/logger.js'

/**
 * Note model for MongoDB storage
 */
class NoteModel {
  constructor(data = {}) {
    this._id = data._id || data.id || null
    this.title = data.title || ''
    this.content = data.content || ''
    this.tags = Array.isArray(data.tags) ? data.tags : []
    this.createdAt = data.createdAt || new Date()
    this.updatedAt = data.updatedAt || new Date()
  }

  /**
   * Create NoteModel from MongoDB document
   * @param {Object} doc - MongoDB document
   * @returns {NoteModel} Note model instance
   */
  static fromDocument(doc) {
    if (!doc) {
      throw new Error('Cannot create NoteModel from null or undefined document')
    }
    return new NoteModel(doc)
  }

  /**
   * Convert to MongoDB document format
   * @returns {Object} MongoDB document
   */
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

  /**
   * Validate note data
   * @throws {Error} If validation fails
   */
  validate() {
    if (!this.title || typeof this.title !== 'string' || this.title.trim().length === 0) {
      throw new Error('Note title is required and must be a non-empty string')
    }
    if (typeof this.content !== 'string') {
      throw new Error('Note content must be a string')
    }
    if (!Array.isArray(this.tags)) {
      throw new Error('Note tags must be an array')
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
import { createLogger } from '../../../common/logging/logger.js'

/**
 * Domain-specific error for duplicate note operations
 */
class DuplicateNoteError extends Error {
  constructor(field, value) {
    super(`Duplicate note ${field}: '${value}' already exists`)
    this.name = 'DuplicateNoteError'
    this.statusCode = 409
    this.field = field
    this.value = value
  }
}

/**
 * Domain-specific error for note not found
 */
class NoteNotFoundError extends Error {
  constructor(id) {
    super(`Note with ID ${id} not found`)
    this.name = 'NoteNotFoundError'
    this.statusCode = 404
    this.noteId = id
  }
}

/**
 * MongoDB repository for note management following Repository Pattern
 */
class MongoNoteRepository {
  constructor(db) {
    if (!db) {
      throw new Error('Database instance is required')
    }
    this.collection = db.collection('notes')
    this.logger = createLogger()
  }

  /**
   * Create a new note
   * @param {Object} noteData - Note data to create
   * @returns {Promise<NoteModel>} Created note model
   */
  async create(noteData) {
    try {
      const note = new NoteModel(noteData)
      note.validate()
      
      const result = await this.collection.insertOne(note.toDocument())
      return NoteModel.fromDocument({
        ...note.toDocument(),
        _id: result.insertedId
      })
    } catch (error) {
      // Handle MongoDB duplicate key error
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0]
        const value = noteData[field]
        throw new DuplicateNoteError(field, value)
      }
      this.logger.error('Error creating note:', error)
      throw error
    }
  }

  /**
   * Find a note by ID
   * @param {string} id - Note ID
   * @returns {Promise<NoteModel|null>} Found note or null
   */
  async findById(id) {
    try {
      if (!ObjectId.isValid(id)) {
        throw new Error(`Invalid ObjectId: ${id}`)
      }
      
      const document = await this.collection.findOne({ _id: new ObjectId(id) })
      return document ? NoteModel.fromDocument(document) : null
    } catch (error) {
      this.logger.error(`Error finding note by ID ${id}:`, error)
      throw error
    }
  }

  /**
   * Find all notes with optional filtering
   * @param {Object} filters - Filter options
   * @returns {Promise<NoteModel[]>} Array of notes
   */
  async findAll(filters = {}) {
    try {
      const query = {}
      
      if (filters.tags && Array.isArray(filters.tags) && filters.tags.length > 0) {
        query.tags = { $in: filters.tags }
      }
      
      if (filters.search && typeof filters.search === 'string') {
        // Use text search if available, otherwise regex
        if (await this.hasTextIndex()) {
          query.$text = { $search: filters.search }
        } else {
          query.$or = [
            { title: { $regex: filters.search, $options: 'i' } },
            { content: { $regex: filters.search, $options: 'i' } }
          ]
        }
      }
      
      const documents = await this.collection.find(query).toArray()
      return documents.map(doc => NoteModel.fromDocument(doc))
    } catch (error) {
      this.logger.error('Error finding all notes:', error)
      throw error
    }
  }

  /**
   * Update a note by ID
   * @param {string} id - Note ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<NoteModel|null>} Updated note or null if not found
   */
  async update(id, updateData) {
    try {
      if (!ObjectId.isValid(id)) {
        throw new Error(`Invalid ObjectId: ${id}`)
      }

      const updateDoc = { ...updateData, updatedAt: new Date() }
      const result = await this.collection.findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: updateDoc },
        { returnDocument: 'after' }
      )
      
      return result.value ? NoteModel.fromDocument(result.value) : null
    } catch (error) {
      // Handle MongoDB duplicate key error
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0]
        const value = updateData[field]
        throw new DuplicateNoteError(field, value)
      }
      this.logger.error(`Error updating note ${id}:`, error)
      throw error
    }
  }

  /**
   * Delete a note by ID
   * @param {string} id - Note ID
   * @returns {Promise<boolean>} True if deleted, false if not found
   */
  async delete(id) {
    try {
      if (!ObjectId.isValid(id)) {
        throw new Error(`Invalid ObjectId: ${id}`)
      }

      const result = await this.collection.deleteOne({ _id: new ObjectId(id) })
      return result.deletedCount > 0
    } catch (error) {
      this.logger.error(`Error deleting note ${id}:`, error)
      throw error
    }
  }

  /**
   * Check if text index exists for search functionality
   * @returns {Promise<boolean>} True if text index exists
   */
  async hasTextIndex() {
    try {
      const indexes = await this.collection.indexes()
      return indexes.some(index => index.textIndexVersion !== undefined)
    } catch (error) {
      this.logger.warn('Error checking text index:', error)
      return false
    }
  }
}

export { MongoNoteRepository, DuplicateNoteError, NoteNotFoundError }
```

### Phase 3: Service Layer

**Notes Service**
`src/api/v1/notes/services/note.js`:
```javascript
import { createLogger } from '../../../common/logging/logger.js'
import { DuplicateNoteError, NoteNotFoundError } from '../../../data/mongo/repositories/note.js'

/**
 * Service class for note operations following established service patterns
 */
class NoteService {
  constructor(noteRepository) {
    if (!noteRepository) {
      throw new Error('Note repository is required')
    }
    this.noteRepository = noteRepository
    this.logger = createLogger()
  }

  /**
   * Create a new note
   * @param {Object} noteData - Note creation data
   * @param {string} noteData.title - Note title
   * @param {string} noteData.content - Note content
   * @param {string[]} [noteData.tags] - Note tags
   * @returns {Promise<Object>} Created note details
   */
  async createNote({ title, content, tags = [] }) {
    try {
      if (!title || typeof title !== 'string' || title.trim().length === 0) {
        throw new Error('Note title is required and must be a non-empty string')
      }
      
      const note = await this.noteRepository.create({
        title: title.trim(),
        content: content || '',
        tags: Array.isArray(tags) ? tags : []
      })
      
      return {
        details: {
          id: note._id.toString(),
          title: note.title,
          content: note.content,
          tags: note.tags,
          createdAt: note.createdAt,
          updatedAt: note.updatedAt
        }
      }
    } catch (error) {
      this.logger.error('Error creating note:', error)
      if (error instanceof DuplicateNoteError) {
        throw error
      }
      throw error
    }
  }

  /**
   * Get a note by ID
   * @param {string} id - Note ID
   * @returns {Promise<Object|null>} Note details or null if not found
   */
  async getNoteById(id) {
    try {
      if (!id || typeof id !== 'string') {
        throw new Error('Note ID is required and must be a string')
      }
      
      const note = await this.noteRepository.findById(id)
      if (!note) {
        return null
      }
      
      return {
        details: {
          id: note._id.toString(),
          title: note.title,
          content: note.content,
          tags: note.tags,
          createdAt: note.createdAt,
          updatedAt: note.updatedAt
        }
      }
    } catch (error) {
      this.logger.error(`Error getting note by ID ${id}:`, error)
      throw error
    }
  }

  /**
   * Get all notes with optional filtering
   * @param {Object} [filters] - Filter options
   * @param {string} [filters.search] - Search term
   * @param {string[]} [filters.tags] - Filter by tags
   * @returns {Promise<Object>} Notes collection with metadata
   */
  async getAllNotes(filters = {}) {
    try {
      const notes = await this.noteRepository.findAll(filters)
      return {
        data: notes.map(note => ({
          id: note._id.toString(),
          title: note.title,
          content: note.content,
          tags: note.tags,
          createdAt: note.createdAt,
          updatedAt: note.updatedAt
        })),
        count: notes.length
      }
    } catch (error) {
      this.logger.error('Error getting all notes:', error)
      throw error
    }
  }

  /**
   * Update a note by ID
   * @param {string} id - Note ID
   * @param {Object} updateData - Update data
   * @returns {Promise<Object|null>} Updated note details or null if not found
   */
  async updateNote(id, updateData) {
    try {
      if (!id || typeof id !== 'string') {
        throw new Error('Note ID is required and must be a string')
      }
      
      if (!updateData || typeof updateData !== 'object') {
        throw new Error('Update data is required')
      }
      
      const note = await this.noteRepository.update(id, updateData)
      if (!note) {
        return null
      }
      
      return {
        details: {
          id: note._id.toString(),
          title: note.title,
          content: note.content,
          tags: note.tags,
          createdAt: note.createdAt,
          updatedAt: note.updatedAt
        }
      }
    } catch (error) {
      this.logger.error(`Error updating note ${id}:`, error)
      if (error instanceof DuplicateNoteError) {
        throw error
      }
      throw error
    }
  }

  /**
   * Delete a note by ID
   * @param {string} id - Note ID
   * @returns {Promise<boolean>} True if deleted, false if not found
   */
  async deleteNote(id) {
    try {
      if (!id || typeof id !== 'string') {
        throw new Error('Note ID is required and must be a string')
      }
      
      return await this.noteRepository.delete(id)
    } catch (error) {
      this.logger.error(`Error deleting note ${id}:`, error)
      throw error
    }
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
import { MongoNoteRepository, DuplicateNoteError, NoteNotFoundError } from '../data/mongo/repositories/note.js'
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

  /**
   * Initialize the MCP server with database connection
   */
  async initialize() {
    try {
      this.db = await connectMongo()
      this.noteRepository = new MongoNoteRepository(this.db)
      this.noteService = new NoteService(this.noteRepository)
      this.logger.info('Notes MCP Server initialized successfully')
    } catch (error) {
      this.logger.error('Error initializing Notes MCP Server:', error)
      throw error
    }
  }

  /**
   * Setup MCP tools and resources with proper error handling
   */
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
              text: `Note created successfully:\nID: ${note.details.id}\nTitle: ${note.details.title}\nTags: ${note.details.tags.join(', ')}`
            }]
          }
        } catch (error) {
          this.logger.error('Error creating note via MCP:', error)
          
          let errorMessage = 'Error creating note: Unknown error'
          if (error instanceof DuplicateNoteError) {
            errorMessage = `Error creating note: ${error.message}`
          } else if (error.message.includes('required') || error.message.includes('must be')) {
            errorMessage = `Error creating note: ${error.message}`
          } else {
            errorMessage = `Error creating note: ${error.message}`
          }
          
          return {
            content: [{
              type: 'text',
              text: errorMessage
            }],
            isError: true
          }
        }
      }
    )

    // Tool: Get Note
    this.server.registerTool(
      'get-note',
      {
        title: 'Get Note',
        description: 'Retrieve a note by its ID',
        inputSchema: {
          id: z.string().min(1)
        }
      },
      async ({ id }) => {
        try {
          const note = await this.noteService.getNoteById(id)
          
          if (!note) {
            return {
              content: [{
                type: 'text',
                text: 'Note not found'
              }],
              isError: true
            }
          }
          
          return {
            content: [{
              type: 'text',
              text: `Note Details:\nID: ${note.details.id}\nTitle: ${note.details.title}\nContent: ${note.details.content}\nTags: ${note.details.tags.join(', ')}\nCreated: ${note.details.createdAt}\nUpdated: ${note.details.updatedAt}`
            }]
          }
        } catch (error) {
          this.logger.error('Error getting note via MCP:', error)
          
          let errorMessage = 'Error retrieving note: Unknown error'
          if (error.message.includes('Invalid ObjectId')) {
            errorMessage = 'Error retrieving note: Invalid note ID format'
          } else {
            errorMessage = `Error retrieving note: ${error.message}`
          }
          
          return {
            content: [{
              type: 'text',
              text: errorMessage
            }],
            isError: true
          }
        }
      }
    )

    // Tool: List Notes
    this.server.registerTool(
      'list-notes',
      {
        title: 'List Notes',
        description: 'List all notes with optional search and tag filtering',
        inputSchema: {
          search: z.string().optional(),
          tags: z.array(z.string()).optional()
        }
      },
      async ({ search, tags } = {}) => {
        try {
          const result = await this.noteService.getAllNotes({ search, tags })
          
          if (result.count === 0) {
            return {
              content: [{
                type: 'text',
                text: 'No notes found'
              }]
            }
          }
          
          const notesList = result.data.map(note => 
            `ID: ${note.id}\nTitle: ${note.title}\nTags: ${note.tags.join(', ')}\nCreated: ${note.createdAt}`
          ).join('\n\n')
          
          return {
            content: [{
              type: 'text',
              text: `Found ${result.count} notes:\n\n${notesList}`
            }]
          }
        } catch (error) {
          this.logger.error('Error listing notes via MCP:', error)
          return {
            content: [{
              type: 'text',
              text: `Error listing notes: ${error.message}`
            }],
            isError: true
          }
        }
      }
    )

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
              text: `# ${note.details.title}\n\n${note.details.content}\n\n**Tags:** ${note.details.tags.join(', ')}\n**Created:** ${note.details.createdAt}\n**Updated:** ${note.details.updatedAt}`
            }]
          }
        } catch (error) {
          this.logger.error('Error getting note resource via MCP:', error)
          
          if (error.message.includes('Invalid ObjectId')) {
            throw new Error('Invalid note ID format')
          } else if (error.message.includes('not found')) {
            throw new Error(`Note with ID ${id} not found`)
          } else {
            throw new Error(`Error retrieving note: ${error.message}`)
          }
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

/**
 * Start the MCP server with configured transport
 */
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
    } else {
      throw new Error(`Unsupported transport type: ${transportType}`)
    }
    
    logger.info(`MCP server started successfully using ${transportType} transport`)
  } catch (error) {
    logger.error('Failed to start MCP server:', error)
    throw error
  }
}

/**
 * Start STDIO transport for MCP server
 * @param {NotesMcpServer} mcpServer - The MCP server instance
 */
async function startStdioTransport(mcpServer) {
  try {
    const transport = new StdioServerTransport()
    await mcpServer.getServer().connect(transport)
  } catch (error) {
    const logger = createLogger()
    logger.error('Error starting STDIO transport:', error)
    throw error
  }
}

/**
 * Start HTTP transport for MCP server
 * @param {NotesMcpServer} mcpServer - The MCP server instance
 */
async function startHttpTransport(mcpServer) {
  const logger = createLogger()
  
  try {
    const app = express()
    app.use(express.json())
    
    // Store transports by session ID
    const transports = {}
    
    app.post('/mcp', async (req, res) => {
      try {
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
        }
        
        await transport.handleRequest(req, res, req.body)
      } catch (error) {
        logger.error('Error handling MCP HTTP request:', error)
        res.status(500).json({
          error: 'Internal Server Error',
          message: 'Failed to process MCP request'
        })
      }
    })
    
    const port = config.get('mcp.port')
    app.listen(port, () => {
      logger.info(`MCP HTTP server listening on port ${port}`)
    })
  } catch (error) {
    logger.error('Error starting HTTP transport:', error)
    throw error
  }
}

/**
 * Stop the MCP server and cleanup resources
 */
async function stopMcpServer() {
  const logger = createLogger()
  
  try {
    if (mcpServerInstance) {
      await mcpServerInstance.stop()
      mcpServerInstance = null
      logger.info('MCP server stopped successfully')
    }
  } catch (error) {
    logger.error('Error stopping MCP server:', error)
    throw error
  }
}

export { startMcpServer, stopMcpServer }
```

#### Option B: Integrated Hapi Plugin Implementation

**MCP Hapi Plugin**
`src/api/plugins/mcp.js`:
```javascript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { z } from 'zod'
import { connectMongo } from '../../common/database/mongo.js'
import { MongoNoteRepository, DuplicateNoteError, NoteNotFoundError } from '../../data/mongo/repositories/note.js'
import { NoteService } from '../v1/notes/services/note.js'
import { createLogger } from '../../common/logging/logger.js'

const mcpPlugin = {
  name: 'mcp-server',
  version: '1.0.0',
  register: async function (server, options) {
    const logger = createLogger()
    
    try {
      // Create MCP server instance
      const mcpServer = new McpServer({
        name: 'notes-server',
        version: '1.0.0'
      })

      // Initialize database connection
      const db = await connectMongo()
      const noteRepository = new MongoNoteRepository(db)
      const noteService = new NoteService(noteRepository)

      // Set up MCP tools with proper error handling
      mcpServer.registerTool(
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
            const note = await noteService.createNote({ title, content, tags })
            return {
              content: [{
                type: 'text',
                text: `Note created successfully:\nID: ${note.details.id}\nTitle: ${note.details.title}\nTags: ${note.details.tags.join(', ')}`
              }]
            }
          } catch (error) {
            logger.error('Error creating note via MCP plugin:', error)
            
            let errorMessage = 'Error creating note: Unknown error'
            if (error instanceof DuplicateNoteError) {
              errorMessage = `Error creating note: ${error.message}`
            } else if (error.message.includes('required') || error.message.includes('must be')) {
              errorMessage = `Error creating note: ${error.message}`
            } else {
              errorMessage = `Error creating note: ${error.message}`
            }
            
            return {
              content: [{
                type: 'text',
                text: errorMessage
              }],
              isError: true
            }
          }
        }
      )

      mcpServer.registerTool(
        'get-note',
        {
          title: 'Get Note',
          description: 'Retrieve a note by its ID',
          inputSchema: {
            id: z.string().min(1)
          }
        },
        async ({ id }) => {
          try {
            const note = await noteService.getNoteById(id)
            
            if (!note) {
              return {
                content: [{
                  type: 'text',
                  text: 'Note not found'
                }],
                isError: true
              }
            }
            
            return {
              content: [{
                type: 'text',
                text: `Note Details:\nID: ${note.details.id}\nTitle: ${note.details.title}\nContent: ${note.details.content}\nTags: ${note.details.tags.join(', ')}\nCreated: ${note.details.createdAt}\nUpdated: ${note.details.updatedAt}`
              }]
            }
          } catch (error) {
            logger.error('Error getting note via MCP plugin:', error)
            
            let errorMessage = 'Error retrieving note: Unknown error'
            if (error.message.includes('Invalid ObjectId')) {
              errorMessage = 'Error retrieving note: Invalid note ID format'
            } else {
              errorMessage = `Error retrieving note: ${error.message}`
            }
            
            return {
              content: [{
                type: 'text',
                text: errorMessage
              }],
              isError: true
            }
          }
        }
      )
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
