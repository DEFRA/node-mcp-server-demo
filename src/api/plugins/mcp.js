import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { FileNoteRepository } from '../../data/repositories/note.js'
import { NoteService } from '../v1/notes/services/note.js'
import { createMcpRoutes } from '../v1/mcp/routes/mcp.js'
import { createLogger } from '../../common/logging/logger.js'
import { config } from '../../config/index.js'

/**
 * MCP Server Hapi Plugin
 * Provides Model Context Protocol server functionality as a Hapi plugin
 */
const mcpPlugin = {
  name: 'mcp-server',
  version: '1.0.0',
  register: async function (server, options) {
    const logger = createLogger()
    
    // Check if MCP is enabled
    if (!config.get('mcp.enabled')) {
      logger.info('MCP server plugin is disabled')
      return
    }

    try {
      logger.info('Initializing MCP server plugin...')

      // Create MCP server instance
      const mcpServer = new McpServer({
        name: 'notes-server',
        version: '1.0.0'
      })

      // Initialize services
      const notesDir = config.get('mcp.notesDir')
      const noteRepository = new FileNoteRepository(notesDir)
      const noteService = new NoteService(noteRepository)

      logger.info(`MCP notes directory: ${notesDir}`)

      // Register MCP Tool: create_note
      mcpServer.registerTool(
        'create_note',
        {
          title: 'Create Note',
          description: 'Create a new note with title and content',
          inputSchema: {
            title: z.string().min(1).max(255).describe('The title of the note'),
            content: z.string().describe('The content/body of the note')
          }
        },
        async ({ title, content }) => {
          try {
            logger.debug(`MCP create_note called: "${title}"`)
            
            const result = await noteService.createNote({ title, content })
            
            return {
              content: [{
                type: 'text',
                text: `✅ Note created successfully!

**Title:** ${result.details.title}
**ID:** ${result.details.id}
**Created:** ${result.details.createdAt.toISOString()}`
              }]
            }
          } catch (error) {
            logger.error('MCP create_note error:', error)
            
            return {
              content: [{
                type: 'text',
                text: `❌ Error creating note: ${error.message}`
              }],
              isError: true
            }
          }
        }
      )

      // Register MCP Tool: get_note
      mcpServer.registerTool(
        'get_note',
        {
          title: 'Get Note',
          description: 'Retrieve a note by its ID',
          inputSchema: {
            id: z.string().describe('The ID of the note to retrieve')
          }
        },
        async ({ id }) => {
          try {
            logger.debug(`MCP get_note called: ${id}`)
            
            const note = await noteService.getNoteById(id)
            
            if (!note) {
              return {
                content: [{
                  type: 'text',
                  text: `❌ Note with ID "${id}" not found`
                }],
                isError: true
              }
            }
            
            return {
              content: [{
                type: 'text',
                text: `📝 **${note.details.title}**

${note.details.content}

---
**ID:** ${note.details.id}
**Created:** ${note.details.createdAt.toISOString()}`
              }]
            }
          } catch (error) {
            logger.error('MCP get_note error:', error)
            
            return {
              content: [{
                type: 'text',
                text: `❌ Error retrieving note: ${error.message}`
              }],
              isError: true
            }
          }
        }
      )

      // Register MCP Tool: list_notes
      mcpServer.registerTool(
        'list_notes',
        {
          title: 'List Notes',
          description: 'List all available notes',
          inputSchema: {}
        },
        async () => {
          try {
            logger.debug('MCP list_notes called')
            
            const notes = await noteService.getAllNotes()
            
            if (notes.length === 0) {
              return {
                content: [{
                  type: 'text',
                  text: '📝 No notes found. Create your first note using the create_note tool!'
                }]
              }
            }
            
            const notesList = notes.map((note, index) => 
              `${index + 1}. **${note.details.title}** (ID: ${note.details.id})
   Created: ${note.details.createdAt.toISOString()}
   Preview: ${note.details.content.substring(0, 80)}${note.details.content.length > 80 ? '...' : ''}`
            ).join('\n\n')
            
            return {
              content: [{
                type: 'text',
                text: `📝 **Found ${notes.length} note(s):**

${notesList}

💡 Use get_note with an ID to view the full content of any note.`
              }]
            }
          } catch (error) {
            logger.error('MCP list_notes error:', error)
            
            return {
              content: [{
                type: 'text',
                text: `❌ Error listing notes: ${error.message}`
              }],
              isError: true
            }
          }
        }
      )

      // Register MCP routes with Hapi server
      const mcpRoutes = createMcpRoutes(mcpServer, noteService)
      server.route(mcpRoutes)

      logger.info('MCP server plugin registered successfully')
      logger.info('MCP endpoints available at: /mcp')
      
    } catch (error) {
      logger.error('Error registering MCP server plugin:', error)
      throw error
    }
  }
}

export { mcpPlugin }
