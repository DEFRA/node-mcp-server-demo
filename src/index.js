import process from 'node:process'

import { startServer } from './mcp/server.js'
import { createLogger } from './common/logging/logger.js'
import { setupProxy } from './common/proxy/setup-proxy.js'
import { closeDatabase } from './common/database/mongo/mongo.js'

setupProxy()

const server = await startServer()

/**
 * Graceful shutdown handler
 * @param {string} signal - The signal received (SIGTERM, SIGINT, etc.)
 */
async function gracefulShutdown(signal) {
  const logger = createLogger()
  logger.info(`${signal} received. Shutting down gracefully...`)
  
  try {
    // Stop the server first (this will trigger onPostStop hook which closes the database)
    if (server) {
      logger.info('Stopping Hapi server...')
      await server.stop({ timeout: 10000 })
      logger.info('Server stopped successfully')
    } else {
      logger.warn('Server reference is null or undefined')
      // If no server, close database directly
      await closeDatabase()
    }
    
    logger.info('Graceful shutdown completed')
    process.exit(0)
  } catch (error) {
    logger.error('Error during server shutdown:', error)
    
    // Fallback: close database directly if server shutdown fails
    try {
      await closeDatabase()
    } catch (dbError) {
      logger.error('Error closing database:', dbError)
    }
    
    process.exit(1)
  }
}

// Handle termination signals from docker
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

process.on('unhandledRejection', async (error) => {
  const logger = createLogger()
  logger.info('Unhandled rejection')
  logger.error(error)
  
  await closeDatabase()
  process.exitCode = 1
})