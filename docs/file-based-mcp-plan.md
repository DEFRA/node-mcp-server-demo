# File-Based MCP Server Integration Plan

## 📋 Overview

This document outlines the plan to integrate a Model Context Protocol (MCP) server for note management using **file-based storage** (.md files) into the existing Node.js/Hapi.js project. The server will provide CRUD operations for notes stored as individual Markdown files through MCP tools, resources, and prompts.

## 🏗️ Architecture Approach

### Integrated Hapi Plugin Architecture
```
┌─────────────────────────────────────────┐
│              Hapi Server                │
│              (Port 3000)                │
│                                         │
│  ┌───────────┐    ┌─────────────────┐   │
│  │    API    │    │   MCP Plugin    │   │
│  │ Endpoints │    │   (/mcp route)  │   │
│  └───────────┘    └─────────────────┘   │
└─────────────────────┬───────────────────┘
                      │
               ┌─────────────┐
               │ File System │
               │   (.md)     │
               │   notes/    │
               │ ├─note1.md  │
               │ ├─note2.md  │
               │ └─...       │
               └─────────────┘
```

**Benefits:**
- No database dependency
- Simple file-based storage
- Human-readable markdown format
- Easy backup and version control
- Git-friendly storage
- Single application process
- Leverages Hapi's routing and middleware

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
  notesDirectory: {
    doc: 'Directory to store note files',
    format: String,
    default: './data/notes',
    env: 'MCP_NOTES_DIR'
  }
},
fileStorage: {
  notesPath: {
    doc: 'Path to notes storage directory',
    format: String,
    default: path.resolve(dirname, '../../data/notes'),
    env: 'NOTES_STORAGE_PATH'
  }
}
```

### Phase 2: File System Layer

**1. File System Utilities**
`src/common/filesystem/utils.js`:
```javascript
import fs from 'fs/promises'
import path from 'path'
import { createLogger } from '../logging/logger.js'

class FileSystemUtils {
  static async ensureDirectoryExists(dirPath) {
    try {
      await fs.access(dirPath)
    } catch {
      await fs.mkdir(dirPath, { recursive: true })
    }
  }

  static async fileExists(filePath) {
    try {
      await fs.access(filePath)
      return true
    } catch {
      return false
    }
  }

  static async readFile(filePath) {
    return await fs.readFile(filePath, 'utf-8')
  }

  static async writeFile(filePath, content) {
    await fs.writeFile(filePath, content, 'utf-8')
  }

  static async deleteFile(filePath) {
    await fs.unlink(filePath)
  }

  static async listFiles(dirPath, extension = '.md') {
    try {
      const files = await fs.readdir(dirPath)
      return files.filter(file => file.endsWith(extension))
    } catch {
      return []
    }
  }

  static generateSafeFilename(title) {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
  }
}

export { FileSystemUtils }
```

**2. Note Data Model**
`src/data/models/note.js`:
```javascript
import { randomUUID } from 'crypto'

class NoteModel {
  constructor(data = {}) {
    this.id = data.id || randomUUID()
    this.title = data.title || 'Untitled Note'
    this.content = data.content || ''
    this.tags = Array.isArray(data.tags) ? data.tags : []
    this.createdAt = data.createdAt ? new Date(data.createdAt) : new Date()
    this.updatedAt = data.updatedAt ? new Date(data.updatedAt) : new Date()
    this.filename = data.filename || this.generateFilename()
  }

  generateFilename() {
    const safeTitle = this.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
    return `${this.id.slice(0, 8)}-${safeTitle}.md`
  }

  toMarkdown() {
    const frontMatter = [
      '---',
      `id: ${this.id}`,
      `title: "${this.title}"`,
      `tags: [${this.tags.map(tag => `"${tag}"`).join(', ')}]`,
      `createdAt: ${this.createdAt.toISOString()}`,
      `updatedAt: ${this.updatedAt.toISOString()}`,
      '---',
      '',
      this.content
    ].join('\n')

    return frontMatter
  }

  static fromMarkdown(markdownContent, filename) {
    const frontMatterMatch = markdownContent.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
    
    if (!frontMatterMatch) {
      // No front matter, treat entire content as note content
      return new NoteModel({
        content: markdownContent,
        filename
      })
    }

    const [, frontMatter, content] = frontMatterMatch
    const metadata = {}

    frontMatter.split('\n').forEach(line => {
      const match = line.match(/^(\w+):\s*(.+)$/)
      if (match) {
        const [, key, value] = match
        if (key === 'tags') {
          metadata[key] = value.match(/"([^"]*)"/g)?.map(tag => tag.slice(1, -1)) || []
        } else if (key === 'title') {
          metadata[key] = value.replace(/^"(.*)"$/, '$1')
        } else {
          metadata[key] = value
        }
      }
    })

    return new NoteModel({
      ...metadata,
      content: content.trim(),
      filename
    })
  }

  toJSON() {
    return {
      id: this.id,
      title: this.title,
      content: this.content,
      tags: this.tags,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
      filename: this.filename
    }
  }
}

export { NoteModel }
```

**3. File-Based Notes Repository**
`src/data/repositories/file-note.js`:
```javascript
import path from 'path'
import { FileSystemUtils } from '../../common/filesystem/utils.js'
import { NoteModel } from '../models/note.js'
import { config } from '../../config/index.js'
import { createLogger } from '../../common/logging/logger.js'

class FileNoteRepository {
  constructor() {
    this.notesPath = config.get('fileStorage.notesPath')
    this.logger = createLogger()
  }

  async initialize() {
    await FileSystemUtils.ensureDirectoryExists(this.notesPath)
    this.logger.info(`Notes directory initialized: ${this.notesPath}`)
  }

  async create(noteData) {
    try {
      const note = new NoteModel(noteData)
      const filePath = path.join(this.notesPath, note.filename)
      
      // Ensure unique filename
      let counter = 1
      let finalPath = filePath
      while (await FileSystemUtils.fileExists(finalPath)) {
        const ext = path.extname(note.filename)
        const name = path.basename(note.filename, ext)
        note.filename = `${name}-${counter}${ext}`
        finalPath = path.join(this.notesPath, note.filename)
        counter++
      }

      await FileSystemUtils.writeFile(finalPath, note.toMarkdown())
      this.logger.info(`Note created: ${note.filename}`)
      return note
    } catch (error) {
      this.logger.error('Error creating note:', error)
      throw error
    }
  }

  async findById(id) {
    try {
      const files = await FileSystemUtils.listFiles(this.notesPath)
      
      for (const filename of files) {
        const filePath = path.join(this.notesPath, filename)
        const content = await FileSystemUtils.readFile(filePath)
        const note = NoteModel.fromMarkdown(content, filename)
        
        if (note.id === id) {
          return note
        }
      }
      
      return null
    } catch (error) {
      this.logger.error('Error finding note by ID:', error)
      throw error
    }
  }

  async findByFilename(filename) {
    try {
      const filePath = path.join(this.notesPath, filename)
      
      if (!(await FileSystemUtils.fileExists(filePath))) {
        return null
      }

      const content = await FileSystemUtils.readFile(filePath)
      return NoteModel.fromMarkdown(content, filename)
    } catch (error) {
      this.logger.error('Error finding note by filename:', error)
      throw error
    }
  }

  async findAll(filters = {}) {
    try {
      const files = await FileSystemUtils.listFiles(this.notesPath)
      const notes = []

      for (const filename of files) {
        const filePath = path.join(this.notesPath, filename)
        const content = await FileSystemUtils.readFile(filePath)
        const note = NoteModel.fromMarkdown(content, filename)
        
        // Apply filters
        let includeNote = true
        
        if (filters.tags && filters.tags.length > 0) {
          includeNote = filters.tags.some(tag => note.tags.includes(tag))
        }
        
        if (filters.search && includeNote) {
          const searchLower = filters.search.toLowerCase()
          includeNote = note.title.toLowerCase().includes(searchLower) ||
                       note.content.toLowerCase().includes(searchLower) ||
                       note.tags.some(tag => tag.toLowerCase().includes(searchLower))
        }
        
        if (includeNote) {
          notes.push(note)
        }
      }

      // Sort by updatedAt (newest first)
      return notes.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    } catch (error) {
      this.logger.error('Error finding all notes:', error)
      throw error
    }
  }

  async update(id, updateData) {
    try {
      const existingNote = await this.findById(id)
      if (!existingNote) {
        return null
      }

      // Update note data
      const updatedNote = new NoteModel({
        ...existingNote,
        ...updateData,
        id: existingNote.id, // Preserve original ID
        updatedAt: new Date()
      })

      // If title changed, we might need a new filename
      if (updateData.title && updateData.title !== existingNote.title) {
        const oldFilePath = path.join(this.notesPath, existingNote.filename)
        updatedNote.filename = updatedNote.generateFilename()
        
        // Ensure new filename is unique
        let counter = 1
        let newFilePath = path.join(this.notesPath, updatedNote.filename)
        while (await FileSystemUtils.fileExists(newFilePath) && newFilePath !== oldFilePath) {
          const ext = path.extname(updatedNote.filename)
          const name = path.basename(updatedNote.filename, ext)
          updatedNote.filename = `${name}-${counter}${ext}`
          newFilePath = path.join(this.notesPath, updatedNote.filename)
          counter++
        }

        // Delete old file and create new one
        if (newFilePath !== oldFilePath) {
          await FileSystemUtils.deleteFile(oldFilePath)
        }
        await FileSystemUtils.writeFile(newFilePath, updatedNote.toMarkdown())
      } else {
        // Same filename, just update content
        const filePath = path.join(this.notesPath, existingNote.filename)
        await FileSystemUtils.writeFile(filePath, updatedNote.toMarkdown())
      }

      this.logger.info(`Note updated: ${updatedNote.filename}`)
      return updatedNote
    } catch (error) {
      this.logger.error('Error updating note:', error)
      throw error
    }
  }

  async delete(id) {
    try {
      const note = await this.findById(id)
      if (!note) {
        return false
      }

      const filePath = path.join(this.notesPath, note.filename)
      await FileSystemUtils.deleteFile(filePath)
      this.logger.info(`Note deleted: ${note.filename}`)
      return true
    } catch (error) {
      this.logger.error('Error deleting note:', error)
      throw error
    }
  }

  async getTags() {
    try {
      const notes = await this.findAll()
      const tagSet = new Set()
      
      notes.forEach(note => {
        note.tags.forEach(tag => tagSet.add(tag))
      })
      
      return Array.from(tagSet).sort()
    } catch (error) {
      this.logger.error('Error getting tags:', error)
      throw error
    }
  }
}

export { FileNoteRepository }
```

### Phase 3: Service Layer

**Notes Service**
`src/api/v1/notes/services/file-note.js`:
```javascript
import { FileNoteRepository } from '../../../../data/repositories/file-note.js'

class FileNoteService {
  constructor() {
    this.noteRepository = new FileNoteRepository()
  }

  async initialize() {
    await this.noteRepository.initialize()
  }

  async createNote({ title, content, tags = [] }) {
    const note = await this.noteRepository.create({
      title,
      content,
      tags
    })
    return note.toJSON()
  }

  async getNoteById(id) {
    const note = await this.noteRepository.findById(id)
    return note ? note.toJSON() : null
  }

  async getAllNotes(filters = {}) {
    const notes = await this.noteRepository.findAll(filters)
    return notes.map(note => note.toJSON())
  }

  async updateNote(id, updateData) {
    const note = await this.noteRepository.update(id, updateData)
    return note ? note.toJSON() : null
  }

  async deleteNote(id) {
    return await this.noteRepository.delete(id)
  }

  async searchNotes(query, tags = []) {
    return await this.getAllNotes({ search: query, tags })
  }

  async getAllTags() {
    return await this.noteRepository.getTags()
  }

  async getNoteStats() {
    const notes = await this.getAllNotes()
    const tags = await this.getAllTags()
    
    return {
      totalNotes: notes.length,
      totalTags: tags.length,
      recentNotes: notes.slice(0, 5).map(note => ({
        id: note.id,
        title: note.title,
        updatedAt: note.updatedAt
      }))
    }
  }
}

export { FileNoteService }
```

### Phase 4: MCP Hapi Plugin Implementation

**MCP Hapi Plugin**
`src/api/plugins/mcp.js`:
```javascript
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { z } from 'zod'
import crypto from 'crypto'
import { FileNoteService } from '../v1/notes/services/file-note.js'

const mcpPlugin = {
  name: 'mcp-notes-server',
  version: '1.0.0',
  register: async function (server, options) {
    // Create MCP server instance
    const mcpServer = new McpServer({
      name: 'file-notes-server',
      version: '1.0.0'
    })

    // Initialize note service
    const noteService = new FileNoteService()
    await noteService.initialize()

    // Set up MCP tools
    setupMcpTools(mcpServer, noteService)
    setupMcpResources(mcpServer, noteService)
    setupMcpPrompts(mcpServer, noteService)

    // Store transports by session
    const transports = {}

    // Add MCP routes to Hapi
    server.route([
      {
        method: 'POST',
        path: '/mcp',
        handler: async (request, h) => {
          try {
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

              transport.onclose = () => {
                if (transport.sessionId) {
                  delete transports[transport.sessionId]
                }
              }

              await mcpServer.connect(transport)
            }

            // Create a response wrapper
            const response = h.response()
            
            // Handle the MCP request
            await transport.handleRequest(request.raw.req, response.raw, request.payload)
            
            return response
          } catch (error) {
            server.log(['mcp', 'error'], `MCP POST error: ${error.message}`)
            return h.response({
              jsonrpc: '2.0',
              error: {
                code: -32603,
                message: 'Internal server error'
              },
              id: null
            }).code(500)
          }
        },
        options: {
          description: 'Handle MCP client requests',
          tags: ['mcp'],
          cors: {
            origin: ['*'],
            headers: ['Content-Type', 'mcp-session-id'],
            exposedHeaders: ['mcp-session-id']
          }
        }
      },
      {
        method: 'GET',
        path: '/mcp',
        handler: async (request, h) => {
          try {
            const sessionId = request.headers['mcp-session-id']
            if (!sessionId || !transports[sessionId]) {
              return h.response('Invalid or missing session ID').code(400)
            }

            const transport = transports[sessionId]
            const response = h.response()
            
            await transport.handleRequest(request.raw.req, response.raw)
            
            return response
          } catch (error) {
            server.log(['mcp', 'error'], `MCP GET error: ${error.message}`)
            return h.response('Internal server error').code(500)
          }
        },
        options: {
          description: 'Handle MCP server-sent events',
          tags: ['mcp'],
          cors: {
            origin: ['*'],
            headers: ['Content-Type', 'mcp-session-id'],
            exposedHeaders: ['mcp-session-id']
          }
        }
      }
    ])

    server.log(['mcp'], 'MCP Notes server plugin registered successfully')
  }
}

function setupMcpTools(mcpServer, noteService) {
  // Tool: Create Note
  mcpServer.registerTool(
    'create-note',
    {
      title: 'Create Note',
      description: 'Create a new markdown note with title, content, and tags',
      inputSchema: {
        title: z.string().min(1).max(200).describe('Title of the note'),
        content: z.string().min(1).describe('Markdown content of the note'),
        tags: z.array(z.string()).optional().default([]).describe('Tags for the note')
      }
    },
    async ({ title, content, tags }) => {
      try {
        const note = await noteService.createNote({ title, content, tags })
        return {
          content: [{
            type: 'text',
            text: `Note created successfully!\n\n**ID:** ${note.id}\n**Title:** ${note.title}\n**Tags:** ${note.tags.join(', ') || 'None'}\n**File:** ${note.filename}`
          }]
        }
      } catch (error) {
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

  // Tool: Update Note
  mcpServer.registerTool(
    'update-note',
    {
      title: 'Update Note',
      description: 'Update an existing note by ID',
      inputSchema: {
        id: z.string().describe('ID of the note to update'),
        title: z.string().min(1).max(200).optional().describe('New title for the note'),
        content: z.string().min(1).optional().describe('New markdown content'),
        tags: z.array(z.string()).optional().describe('New tags for the note')
      }
    },
    async ({ id, title, content, tags }) => {
      try {
        const updateData = {}
        if (title !== undefined) updateData.title = title
        if (content !== undefined) updateData.content = content
        if (tags !== undefined) updateData.tags = tags

        const note = await noteService.updateNote(id, updateData)
        if (!note) {
          return {
            content: [{
              type: 'text',
              text: `Note with ID ${id} not found`
            }],
            isError: true
          }
        }

        return {
          content: [{
            type: 'text',
            text: `Note updated successfully!\n\n**ID:** ${note.id}\n**Title:** ${note.title}\n**File:** ${note.filename}`
          }]
        }
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error updating note: ${error.message}`
          }],
          isError: true
        }
      }
    }
  )

  // Tool: Delete Note
  mcpServer.registerTool(
    'delete-note',
    {
      title: 'Delete Note',
      description: 'Delete a note by ID',
      inputSchema: {
        id: z.string().describe('ID of the note to delete')
      }
    },
    async ({ id }) => {
      try {
        const deleted = await noteService.deleteNote(id)
        if (!deleted) {
          return {
            content: [{
              type: 'text',
              text: `Note with ID ${id} not found`
            }],
            isError: true
          }
        }

        return {
          content: [{
            type: 'text',
            text: `Note with ID ${id} deleted successfully`
          }]
        }
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error deleting note: ${error.message}`
          }],
          isError: true
        }
      }
    }
  )

  // Tool: Search Notes
  mcpServer.registerTool(
    'search-notes',
    {
      title: 'Search Notes',
      description: 'Search notes by text content or filter by tags',
      inputSchema: {
        query: z.string().optional().describe('Text to search for in title and content'),
        tags: z.array(z.string()).optional().describe('Tags to filter by')
      }
    },
    async ({ query, tags }) => {
      try {
        const notes = await noteService.searchNotes(query, tags)
        if (notes.length === 0) {
          return {
            content: [{
              type: 'text',
              text: 'No notes found matching the search criteria'
            }]
          }
        }

        const notesText = notes.map(note => 
          `**${note.title}** (${note.id.slice(0, 8)})\nTags: ${note.tags.join(', ') || 'None'}\nUpdated: ${new Date(note.updatedAt).toLocaleDateString()}\n---`
        ).join('\n\n')

        return {
          content: [{
            type: 'text',
            text: `Found ${notes.length} notes:\n\n${notesText}`
          }]
        }
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error searching notes: ${error.message}`
          }],
          isError: true
        }
      }
    }
  )

  // Tool: List All Notes
  mcpServer.registerTool(
    'list-notes',
    {
      title: 'List All Notes',
      description: 'Get a list of all notes with basic information',
      inputSchema: {}
    },
    async () => {
      try {
        const notes = await noteService.getAllNotes()
        if (notes.length === 0) {
          return {
            content: [{
              type: 'text',
              text: 'No notes found'
            }]
          }
        }

        const notesList = notes.map(note => 
          `• **${note.title}** (${note.id.slice(0, 8)}) - ${note.tags.join(', ') || 'No tags'}`
        ).join('\n')

        return {
          content: [{
            type: 'text',
            text: `Found ${notes.length} notes:\n\n${notesList}`
          }]
        }
      } catch (error) {
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

  // Tool: Get Note Stats
  mcpServer.registerTool(
    'note-stats',
    {
      title: 'Note Statistics',
      description: 'Get statistics about your notes collection',
      inputSchema: {}
    },
    async () => {
      try {
        const stats = await noteService.getNoteStats()
        
        const recentNotesText = stats.recentNotes.length > 0 
          ? stats.recentNotes.map(note => 
              `• ${note.title} (${new Date(note.updatedAt).toLocaleDateString()})`
            ).join('\n')
          : 'None'

        return {
          content: [{
            type: 'text',
            text: `📊 **Notes Statistics**\n\n**Total Notes:** ${stats.totalNotes}\n**Total Tags:** ${stats.totalTags}\n\n**Recent Notes:**\n${recentNotesText}`
          }]
        }
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error getting note statistics: ${error.message}`
          }],
          isError: true
        }
      }
    }
  )
}

function setupMcpResources(mcpServer, noteService) {
  // Resource: Individual Note
  mcpServer.registerResource(
    'note',
    new ResourceTemplate('note://{id}', { list: undefined }),
    {
      title: 'Note Resource',
      description: 'Access individual notes by ID',
      mimeType: 'text/markdown'
    },
    async (uri, { id }) => {
      try {
        const note = await noteService.getNoteById(id)
        if (!note) {
          throw new Error(`Note with ID ${id} not found`)
        }

        return {
          contents: [{
            uri: uri.href,
            mimeType: 'text/markdown',
            text: `# ${note.title}\n\n${note.content}\n\n---\n*Tags: ${note.tags.join(', ') || 'None'}*\n*Created: ${new Date(note.createdAt).toLocaleDateString()}*\n*Updated: ${new Date(note.updatedAt).toLocaleDateString()}*`
          }]
        }
      } catch (error) {
        throw new Error(`Error fetching note resource: ${error.message}`)
      }
    }
  )

  // Resource: Notes Collection
  mcpServer.registerResource(
    'notes-collection',
    'notes://collection',
    {
      title: 'Notes Collection',
      description: 'Access all notes as a collection',
      mimeType: 'application/json'
    },
    async (uri) => {
      try {
        const notes = await noteService.getAllNotes()
        return {
          contents: [{
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(notes, null, 2)
          }]
        }
      } catch (error) {
        throw new Error(`Error fetching notes collection: ${error.message}`)
      }
    }
  )

  // Resource: Tags List
  mcpServer.registerResource(
    'tags-list',
    'notes://tags',
    {
      title: 'Available Tags',
      description: 'List of all tags used in notes',
      mimeType: 'application/json'
    },
    async (uri) => {
      try {
        const tags = await noteService.getAllTags()
        return {
          contents: [{
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(tags, null, 2)
          }]
        }
      } catch (error) {
        throw new Error(`Error fetching tags list: ${error.message}`)
      }
    }
  )
}

function setupMcpPrompts(mcpServer, noteService) {
  // Prompt: Note Template
  mcpServer.registerPrompt(
    'note-template',
    {
      title: 'Note Template',
      description: 'Generate a structured note template based on type and topic',
      argsSchema: {
        topic: z.string().describe('Topic or subject of the note'),
        type: z.enum(['meeting', 'research', 'todo', 'idea', 'journal', 'project']).default('idea').describe('Type of note template')
      }
    },
    ({ topic, type }) => {
      const templates = {
        meeting: `# ${topic} Meeting Notes\n\n## Date\n${new Date().toLocaleDateString()}\n\n## Attendees\n- \n\n## Agenda\n1. \n\n## Discussion Points\n\n## Decisions Made\n\n## Action Items\n- [ ] \n\n## Next Meeting\n`,
        research: `# ${topic} Research\n\n## Objective\n\n## Background\n\n## Key Questions\n1. \n\n## Research Sources\n- \n\n## Key Findings\n\n## Analysis\n\n## Conclusions\n\n## Next Steps\n`,
        todo: `# ${topic} Todo List\n\n## High Priority\n- [ ] \n\n## Medium Priority\n- [ ] \n\n## Low Priority\n- [ ] \n\n## Completed ✅\n- [x] \n\n## Notes\n`,
        idea: `# ${topic}\n\n## Core Concept\n\n## Problem it Solves\n\n## Key Benefits\n- \n\n## Implementation Ideas\n\n## Potential Challenges\n\n## Resources Needed\n\n## Next Steps\n`,
        journal: `# ${topic} - ${new Date().toLocaleDateString()}\n\n## Reflection\n\n## Key Events\n\n## Lessons Learned\n\n## Gratitude\n\n## Tomorrow's Focus\n`,
        project: `# ${topic} Project\n\n## Overview\n\n## Objectives\n\n## Scope\n\n## Timeline\n\n## Resources\n\n## Milestones\n- [ ] \n\n## Risks & Mitigation\n\n## Success Criteria\n`
      }

      return {
        messages: [{
          role: 'user',
          content: {
            type: 'text',
            text: `Please create a note using this template:\n\n${templates[type]}`
          }
        }]
      }
    }
  )

  // Prompt: Note Summary
  mcpServer.registerPrompt(
    'summarize-notes',
    {
      title: 'Summarize Notes',
      description: 'Create a summary of notes filtered by tags or search terms',
      argsSchema: {
        tags: z.array(z.string()).optional().describe('Filter notes by these tags'),
        searchTerm: z.string().optional().describe('Search term to filter notes')
      }
    },
    async ({ tags, searchTerm }) => {
      try {
        const notes = await noteService.searchNotes(searchTerm, tags)
        const notesContent = notes.map(note => 
          `## ${note.title}\n${note.content}\n`
        ).join('\n')

        return {
          messages: [{
            role: 'user',
            content: {
              type: 'text',
              text: `Please provide a summary of these notes:\n\n${notesContent}`
            }
          }]
        }
      } catch (error) {
        return {
          messages: [{
            role: 'user',
            content: {
              type: 'text',
              text: `Error retrieving notes for summary: ${error.message}`
            }
          }]
        }
      }
    }
  )
}

export { mcpPlugin }
```

### Phase 5: Integration with Main Application

**Update Main Server**
Modify `src/api/server.js`:
```javascript
import { mcpPlugin } from './plugins/mcp.js'
import { config } from '../config/index.js'

async function createServer () {
  const server = hapi.server({
    port: config.get('port'),
    routes: {
      validate: {
        options: {
          abortEarly: false
        }
      },
      files: {
        relativeTo: path.resolve(config.get('root'), '.public')
      },
      security: {
        hsts: {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: false
        },
        xss: 'enabled',
        noSniff: true,
        xframe: true
      },
      cors: {
        origin: ['*'],
        headers: ['Content-Type', 'mcp-session-id'],
        exposedHeaders: ['mcp-session-id']
      }
    },
    router: {
      stripTrailingSlash: true
    }
  })

  const plugins = [
    requestLogger,
    requestTracing,
    pulse,
    probesRouter
  ]

  // Add MCP plugin if enabled
  if (config.get('mcp.enabled')) {
    plugins.push(mcpPlugin)
  }

  await server.register(plugins)

  return server
}
```

**Update Configuration**
Add to `src/config/server.js`:
```javascript
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dirname = path.dirname(fileURLToPath(import.meta.url))

// Add to existing serverConfig object:
mcp: {
  enabled: {
    doc: 'Enable MCP server',
    format: Boolean,
    default: true,
    env: 'MCP_ENABLED'
  }
},
fileStorage: {
  notesPath: {
    doc: 'Path to notes storage directory',
    format: String,
    default: path.resolve(dirname, '../../data/notes'),
    env: 'NOTES_STORAGE_PATH'
  }
}
```

### Phase 6: Directory Structure

Create the following directory structure:
```
src/
├── api/
│   ├── plugins/
│   │   └── mcp.js                    # MCP Hapi plugin
│   └── v1/
│       └── notes/
│           └── services/
│               └── file-note.js      # File-based note service
├── common/
│   └── filesystem/
│       └── utils.js                  # File system utilities
├── data/
│   ├── models/
│   │   └── note.js                   # Note data model
│   ├── repositories/
│   │   └── file-note.js              # File-based repository
│   └── notes/                        # Note storage directory
│       ├── example-note.md
│       └── ...
└── config/
    └── server.js                     # Updated with MCP config
```

### Phase 7: Testing Strategy

**Unit Tests**
`test/unit/mcp/file-note-service.test.js`:
```javascript
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { FileNoteService } from '../../../src/api/v1/notes/services/file-note.js'

vi.mock('../../../src/data/repositories/file-note.js')

describe('FileNoteService', () => {
  let noteService

  beforeEach(() => {
    noteService = new FileNoteService()
  })

  test('should create a note', async () => {
    const noteData = {
      title: 'Test Note',
      content: 'This is a test note',
      tags: ['test']
    }

    const result = await noteService.createNote(noteData)
    
    expect(result).toHaveProperty('id')
    expect(result.title).toBe('Test Note')
    expect(result.tags).toEqual(['test'])
  })

  test('should find note by id', async () => {
    const result = await noteService.getNoteById('test-id')
    expect(result).toBeDefined()
  })
})
```

**Integration Tests**
`test/integration/narrow/mcp/plugin.test.js`:
```javascript
import { beforeEach, describe, expect, test } from 'vitest'
import hapi from '@hapi/hapi'
import { mcpPlugin } from '../../../../src/api/plugins/mcp.js'

describe('MCP Plugin Integration', () => {
  let server

  beforeEach(async () => {
    server = hapi.server({ port: 0 })
    await server.register(mcpPlugin)
  })

  test('should register MCP routes', () => {
    const routes = server.table()
    const mcpRoutes = routes.filter(route => route.path === '/mcp')
    
    expect(mcpRoutes).toHaveLength(2) // POST and GET
    expect(mcpRoutes.some(route => route.method === 'post')).toBe(true)
    expect(mcpRoutes.some(route => route.method === 'get')).toBe(true)
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
    "content": "# New Feature Ideas\n\n- User authentication\n- Dark mode\n- Mobile app",
    "tags": ["project", "ideas", "features"]
  }
}
```

### Accessing Note as Resource
```javascript
{
  "uri": "note://a1b2c3d4-e5f6-7890-abcd-ef1234567890"
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

### Searching Notes
```javascript
{
  "name": "search-notes",
  "arguments": {
    "query": "feature",
    "tags": ["project"]
  }
}
```

## 📝 Development Scripts

Update `package.json`:
```json
{
  "scripts": {
    "start:mcp": "NODE_ENV=development MCP_ENABLED=true node src/index.js",
    "test:mcp": "vitest run test/unit/mcp/ test/integration/narrow/mcp/",
    "notes:init": "mkdir -p data/notes"
  }
}
```

## 🐳 Docker Configuration

Update `compose.yaml`:
```yaml
services:
  node-mcp-server-demo:
    # ... existing config ...
    volumes:
      - ./src/:/home/node/src
      - ./data/:/home/node/data    # Mount notes directory
      - ./package.json:/home/node/package.json
    environment:
      # ... existing env vars ...
      MCP_ENABLED: true
      NOTES_STORAGE_PATH: /home/node/data/notes
```

## 📋 Implementation Checklist

### Phase 1: Setup ✅
- [ ] Install MCP SDK dependencies (`@modelcontextprotocol/sdk`, `zod`)
- [ ] Add MCP configuration to server config
- [ ] Create notes storage directory structure

### Phase 2: File System Layer ✅
- [ ] Implement file system utilities
- [ ] Create Note data model with markdown support
- [ ] Implement file-based note repository
- [ ] Add front matter parsing for metadata

### Phase 3: Service Layer ✅
- [ ] Implement FileNoteService
- [ ] Add search and filtering capabilities
- [ ] Implement tag management
- [ ] Add note statistics functionality

### Phase 4: MCP Integration ✅
- [ ] Create MCP Hapi plugin
- [ ] Implement MCP tools (CRUD operations)
- [ ] Add MCP resources (note access)
- [ ] Create MCP prompts (templates)
- [ ] Add session management

### Phase 5: Main App Integration ✅
- [ ] Update main server to conditionally load MCP plugin
- [ ] Add CORS configuration for MCP endpoints
- [ ] Update configuration management
- [ ] Add environment variables

### Phase 6: Testing ✅
- [ ] Unit tests for file operations
- [ ] Unit tests for MCP tools
- [ ] Integration tests for Hapi plugin
- [ ] End-to-end MCP communication tests

### Phase 7: Documentation ✅
- [ ] API documentation for MCP endpoints
- [ ] Usage examples and tutorials
- [ ] File format documentation
- [ ] Deployment and configuration guide

## 🔧 Configuration Options

### Environment Variables
- `MCP_ENABLED`: Enable/disable MCP server (default: true)
- `NOTES_STORAGE_PATH`: Path to notes directory (default: ./data/notes)

### MCP Tools Available
- **create-note**: Create new markdown notes
- **update-note**: Update existing notes
- **delete-note**: Delete notes by ID
- **search-notes**: Search notes by content/tags
- **list-notes**: List all notes
- **note-stats**: Get collection statistics

### MCP Resources Available
- **note://[id]**: Individual note content as markdown
- **notes://collection**: All notes as JSON collection
- **notes://tags**: Available tags list

### MCP Prompts Available
- **note-template**: Generate structured note templates
- **summarize-notes**: Create summaries of filtered notes

## 📁 File Format

Notes are stored as markdown files with YAML front matter:
```markdown
---
id: a1b2c3d4-e5f6-7890-abcd-ef1234567890
title: "My Note Title"
tags: ["tag1", "tag2"]
createdAt: 2025-01-31T10:00:00.000Z
updatedAt: 2025-01-31T10:30:00.000Z
---

# My Note Title

This is the content of the note in **markdown** format.

## Subsection

- Bullet point 1
- Bullet point 2

[Link to something](https://example.com)
```

## 🔍 Benefits of File-Based Approach

1. **No Database Required**: Eliminates MongoDB dependency
2. **Human Readable**: Notes stored as standard markdown files
3. **Version Control Friendly**: Files can be tracked in Git
4. **Portable**: Easy to backup, move, and export
5. **Editor Compatible**: Notes can be edited in any text editor
6. **Search Friendly**: OS-level search tools work on files
7. **Simple Deployment**: No database setup or migrations needed

## 🚦 Next Steps

1. **Start Simple**: Begin with basic MCP plugin registration
2. **File System Setup**: Create file utilities and note model
3. **Basic CRUD**: Implement create/read operations first
4. **MCP Integration**: Add tools and resources incrementally
5. **Testing**: Add comprehensive test coverage
6. **Documentation**: Document API and usage patterns
7. **Enhancement**: Add advanced features like full-text search, note linking, etc.

This plan provides a comprehensive roadmap for implementing a file-based MCP server for note management that integrates seamlessly with your existing Hapi.js application without requiring database setup.
