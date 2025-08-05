import { FileNoteRepository } from '../../data/repositories/note.js'
import { NoteService } from '../v1/notes/services/note.js'
import { mcpTransportRoutes } from '../v1/mcp/endpoints/mcp-transport.js'
import { createLogger } from '../../common/logging/logger.js'
import { config } from '../../config/index.js'

/**
 * MCP Transport Server Hapi Plugin
 * Provides Model Context Protocol server functionality using StreamableHTTPServerTransport
 * This replaces the direct JSON-RPC implementation with the official MCP SDK transport
 */
const mcpTransportPlugin = {
  name: 'mcp-transport-server',
  version: '1.0.0',
  register: async function (server, options) {
    const logger = createLogger()
    
    try {
      logger.info('Initializing MCP Transport server plugin...')

      // Initialize repository and services (reusing existing architecture)
      const notesDir = config.get('mcp.notesDir')
      const noteRepository = new FileNoteRepository(notesDir)
      const noteService = new NoteService(noteRepository)

      logger.info(`MCP notes directory: ${notesDir}`)

      // Store services in server app context for use in transport handlers
      server.app.noteService = noteService

      // Register MCP transport routes (replaces existing /api/v1/mcp endpoint)
      server.route(mcpTransportRoutes)

      logger.info('MCP Transport server plugin registered successfully')
      logger.info('MCP SDK transport endpoints available at: /api/v1/mcp')
      logger.info('Protocol: StreamableHTTPServerTransport with session management')
      
    } catch (error) {
      logger.error('Error registering MCP Transport server plugin:', error)
      throw error
    }
  }
}

export { mcpTransportPlugin }
