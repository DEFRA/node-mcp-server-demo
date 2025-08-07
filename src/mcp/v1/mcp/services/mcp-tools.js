import { createLogger } from '../../../../common/logging/logger.js'
import { z } from 'zod'

/**
 * Register MCP tools with the SDK McpServer
 * This bridges our existing service layer with the MCP SDK
 *
 * @param {import('@modelcontextprotocol/sdk/server/mcp.js').McpServer} mcpServer - MCP SDK server instance
 * @param {import('../../notes/services/note.js').NoteService} noteService - Our existing note service
 */
async function registerMcpTools (mcpServer, mcpNoteService) {
  const logger = createLogger()

  logger.info('Registering MCP tools with SDK server')

  // Create MCP Note
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

  // List MCP Notes
  mcpServer.registerTool('list_mcp_notes', {
    description: 'List all available MCP notes with their metadata'
  },
  async function listMcpNotesHandler (params) {
    logger.debug('Executing list_mcp_notes tool', { params })

    try {
      const notes = await mcpNoteService.getAllNotes()

      if (notes.length === 0) {
        return {
          content: [{
            type: 'text',
            text: '📝 **No MCP notes found**\n\nUse the create_mcp_note tool to create your first note.'
          }]
        }
      }

      const notesList = notes.map(function (noteWrapper) {
        return `- **${noteWrapper.details.title}** (Note ID: ${noteWrapper.details.noteId}) - Created: ${noteWrapper.details.createdAt}`
      }).join('\n')

      return {
        content: [{
          type: 'text',
          text: `📝 **Available MCP Notes** (${notes.length} total)\n\n${notesList}\n\nUse the get_mcp_note tool with a specific Note ID to retrieve a note's content.`
        }]
      }
    } catch (error) {
      logger.error('Error in list_mcp_notes tool:', error)
      return {
        content: [{
          type: 'text',
          text: `❌ Failed to list MCP notes: ${error.message}`
        }],
        isError: true
      }
    }
  }
  )

  // Delete MCP Note by ID
  mcpServer.registerTool('delete_mcp_note', {
    description: 'Delete an MCP note by its unique noteId',
    inputSchema: {
      noteId: z.string().uuid()
    }
  }, async function (params) {
    logger.debug('Executing delete_mcp_note tool', { params })

    try {
      const { noteId } = params
      const result = await mcpNoteService.deleteByNoteId(noteId)
      console.log('Delete result:', result)

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
          text: `🗑️ **MCP Note Deleted**

**Note ID:** ${noteId}`
        }]
      }
    } catch (error) {
      logger.error('Error in delete_mcp_note tool:', error)
      return {
        content: [{
          type: 'text',
          text: `❌ Failed to delete note: ${error.message}`
        }],
        isError: true
      }
    }
  })

  logger.info('Successfully registered all MCP tools with SDK server')
}

export { registerMcpTools }
