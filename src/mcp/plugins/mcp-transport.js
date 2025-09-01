import { mcpTransportRoutes } from '../v1/mcp/endpoints/mcp-transport.js'
import { createNoteWithValidation, fetchNoteById, fetchAllNotes, removeNoteById } from '../v1/notes/services/mcp-notes.js'
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

      // Register service functions directly
      server.decorate('server', 'mcpNoteService', {
        createNoteWithValidation,
        fetchNoteById,
        fetchAllNotes,
        removeNoteById
      })

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
