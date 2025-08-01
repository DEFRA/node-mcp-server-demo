import { FileNoteRepository } from '../../data/repositories/note.js'
import { NoteService } from '../v1/notes/services/note.js'
import { McpService } from '../v1/mcp/services/mcp.js'
import { mcpRoutes } from '../v1/mcp/endpoints/mcp.js'
import { createLogger } from '../../common/logging/logger.js'
import { config } from '../../config/index.js'

/**
 * MCP Server Hapi Plugin following established plugin patterns
 * Provides Model Context Protocol server functionality as a Hapi plugin
 */
const mcpPlugin = {
  name: 'mcp-server',
  version: '1.0.0',
  register: async function (server, options) {
    const logger = createLogger()
    
    try {
      logger.info('Initializing MCP server plugin...')

      // Initialize repository and services
      const notesDir = config.get('mcp.notesDir', './data/notes')
      const noteRepository = new FileNoteRepository(notesDir)
      const noteService = new NoteService(noteRepository)
      const mcpService = new McpService(noteService)

      logger.info(`MCP notes directory: ${notesDir}`)

      // Store services in server app context for use in route handlers
      server.app.mcpService = mcpService
      server.app.noteService = noteService

      // Register MCP routes
      server.route(mcpRoutes)

      logger.info('MCP server plugin registered successfully')
      logger.info('MCP endpoints available at: /api/v1/mcp')
      
    } catch (error) {
      logger.error('Error registering MCP server plugin:', error)
      throw error
    }
  }
}

export { mcpPlugin }
