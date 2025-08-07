import { createLogger } from '../../../../common/logging/logger.js'
import { z } from 'zod'

/**
 * Register MCP tools with the SDK McpServer
 * This bridges our existing service layer with the MCP SDK
 *
 * @param {import('@modelcontextprotocol/sdk/server/mcp.js').McpServer} mcpServer - MCP SDK server instance
 * @param {import('../../notes/services/note.js').NoteService} noteService - Our existing note service
 */
async function registerMcpTools (mcpServer, noteService, mcpNoteService) {
  const logger = createLogger()

  logger.info('Registering MCP tools with SDK server')

  // Create Note Tool
  mcpServer.registerTool('create_note', {
    description: 'Create a new note with title and content',
    inputSchema: {
      title: z.string().min(1).max(255),
      content: z.string().max(10000)
    }
  }, async (params) => {
    logger.debug('Executing create_note tool', { params })

    try {
      const { title, content } = params
      const result = await noteService.createNote({ title, content })

      return {
        content: [{
          type: 'text',
          text: `✅ **Note created successfully!**

**Title:** ${result.details.title}
**ID:** ${result.details.id}
**Created:** ${result.details.createdAt.toISOString()}

The note has been saved and can be retrieved using the get_note tool with ID: ${result.details.id}`
        }]
      }
    } catch (error) {
      logger.error('Error in create_note tool:', error)
      return {
        content: [{
          type: 'text',
          text: `❌ Failed to create note: ${error.message}`
        }],
        isError: true
      }
    }
  })

  // Get Note Tool
  mcpServer.registerTool('get_note', {
    description: 'Retrieve a note by its unique ID',
    inputSchema: {
      noteId: z.string().regex(/^note_\d+_[a-z0-9]+$/, 'Invalid note ID format')
    }
  }, async (params) => {
    logger.debug('Executing get_note tool', { params })

    try {
      const { noteId } = params
      const result = await noteService.getNoteById(noteId)

      if (!result) {
        return {
          content: [{
            type: 'text',
            text: `❌ Note not found with ID: ${noteId}`
          }],
          isError: true
        }
      }

      return {
        content: [{
          type: 'text',
          text: `📝 **Note Retrieved**

**Title:** ${result.details.title}
**ID:** ${result.details.id}
**Created:** ${result.details.createdAt}
**Updated:** ${result.details.updatedAt}

**Content:**
${result.details.content}`
        }]
      }
    } catch (error) {
      logger.error('Error in get_note tool:', error)
      return {
        content: [{
          type: 'text',
          text: `❌ Failed to retrieve note: ${error.message}`
        }],
        isError: true
      }
    }
  })

  // List Notes Tool
  mcpServer.registerTool('list_notes', {
    description: 'List all available notes with their metadata'
  }, async (params) => {
    logger.debug('Executing list_notes tool', { params })

    try {
      const notes = await noteService.getAllNotes()

      if (notes.length === 0) {
        return {
          content: [{
            type: 'text',
            text: '📝 **No notes found**\n\nUse the create_note tool to create your first note.'
          }]
        }
      }

      const notesList = notes.map(noteWrapper =>
        `- **${noteWrapper.details.title}** (ID: ${noteWrapper.details.id}) - Created: ${noteWrapper.details.createdAt}`
      ).join('\n')

      return {
        content: [{
          type: 'text',
          text: `📝 **Available Notes** (${notes.length} total)\n\n${notesList}\n\nUse the get_note tool with a specific ID to retrieve a note's content.`
        }]
      }
    } catch (error) {
      logger.error('Error in list_notes tool:', error)
      return {
        content: [{
          type: 'text',
          text: `❌ Failed to list notes: ${error.message}`
        }],
        isError: true
      }
    }
  })

  // Create Note in MongoDB
  mcpServer.registerTool('create_mcp_note', {
    description: 'Create a new MCP note with title and content',
    inputSchema: {
      title: z.string().min(1).max(255),
      content: z.string().max(10000)
    }
  }, async function (params) {
    logger.debug('Executing create_mcp_note tool', { params })

    try {
      const { title, content } = params
      const result = await mcpNoteService.createNote({ title, content })

      return {
        content: [{
          type: 'text',
          text: `✅ **MCP Note created successfully!**

**Title:** ${result.details.title}
**Note ID:** ${result.details.noteId}
**Created:** ${result.details.createdAt.toISOString()}`
        }]
      }
    } catch (error) {
      logger.error('Error in create_mpc_note tool:', error)
      return {
        content: [{
          type: 'text',
          text: `❌ Failed to create MCP note: ${error.message}`
        }],
        isError: true
      }
    }
  })

  // Get MCP Note by ID
  mcpServer.registerTool('get_mcp_note', {
    description: 'Retrieve an MCP note by its unique noteId',
    inputSchema: {
      noteId: z.string().uuid()
    }
  }, async function (params) {
    logger.debug('Executing get_mcp_note tool', { params })

    try {
      const { noteId } = params
      const result = await mcpNoteService.getNoteById(noteId)

      if (!result) {
        return {
          content: [{
            type: 'text',
            text: `❌ Note not found with ID: ${noteId}`
          }]
        }
      }

      return {
        content: [{
          type: 'text',
          text: `📝 **MCP Note Retrieved**

**Title:** ${result.details.title}
**ID:** ${result.details.noteId}
**Created:** ${result.details.createdAt}
**Updated:** ${result.details.updatedAt}

**Content:**
${result.details.content}`
        }]
      }
    } catch (error) {
      logger.error('Error in get_mcp_note tool:', error)
      return {
        content: [{
          type: 'text',
          text: `❌ Failed to retrieve note: ${error.message}`
        }],
        isError: true
      }
    }
  })

  logger.info('Successfully registered all MCP tools with SDK server')
}

export { registerMcpTools }
