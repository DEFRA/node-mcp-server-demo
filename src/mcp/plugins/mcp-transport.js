import { mcpTransportRoutes } from '../v1/mcp/endpoints/mcp-transport.js'
<<<<<<< HEAD
import { createNoteWithValidation, fetchNoteById, fetchAllNotes, removeNoteById } from '../v1/notes/services/mcp-notes.js'
=======
import { createMcpNoteService } from '../v1/notes/services/mcp-notes.js'
>>>>>>> 433fa523ed9e5fc7d9ce83c14fe1a2fb5b05f819
import { createLogger } from '../../common/logging/logger.js'

/**
 * MCP Transport Server Hapi Plugin
 * Provides Model Context Protocol server functionality using StreamableHTTPServerTransport
 */
const mcpTransportPlugin = {
  name: 'mcp-transport-server',
  version: '1.0.0',
  register: async function (server, options) {
    const logger = createLogger()

    try {
      logger.info('Initializing MCP Transport server plugin...')

<<<<<<< HEAD
      // Register service functions directly
      server.decorate('server', 'mcpNoteService', {
        createNoteWithValidation,
        fetchNoteById,
        fetchAllNotes,
        removeNoteById
      })
=======
      // Create services
      const mcpNoteService = createMcpNoteService()

      // Store services in server app context for use in transport handlers
      // server.app.mcpNoteService = mcpNoteService
      server.decorate('server', 'mcpNoteService', mcpNoteService)
>>>>>>> 433fa523ed9e5fc7d9ce83c14fe1a2fb5b05f819

      // Register MCP transport routes (replaces existing /mcp endpoint)
      server.route(mcpTransportRoutes)

      logger.info('MCP Transport server plugin registered successfully')
      logger.info('MCP SDK transport endpoints available at: /mcp')
      logger.info('Protocol: StreamableHTTPServerTransport with session management')
    } catch (error) {
      logger.error('Error registering MCP Transport server plugin:', error)
      throw error
    }
  }
}

export { mcpTransportPlugin }
