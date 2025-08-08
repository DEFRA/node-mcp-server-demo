import { mcpTransportRoutes } from '../v1/mcp/endpoints/mcp-transport.js'
import { createMcpNoteRepository } from '../../data/repositories/mcp-notes.js'
import { createMcpNoteService } from '../v1/notes/services/mcp-notes.js'
import { createLogger } from '../../common/logging/logger.js'
import { config } from '../../config/index.js'
import { MongoClient } from 'mongodb'

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

      // Connect to MongoDB
      const mongoUri = config.get('mongo.uri')
      const mongoClient = new MongoClient(mongoUri)
      await mongoClient.connect()
      const db = mongoClient.db(config.get('mongo.databaseName'))

      // Create repositories and services
      const mcpNoteRepository = createMcpNoteRepository(db)
      const mcpNoteService = createMcpNoteService(mcpNoteRepository)

      // Store services in server app context for use in transport handlers
      server.app.mcpNoteService = mcpNoteService

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
