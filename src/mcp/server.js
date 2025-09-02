import hapi from '@hapi/hapi'
import path from 'path'

import { createLogger } from '../common/logging/logger.js'
import { config } from '../config/index.js'
import { pulse } from './plugins/pulse.js'
import { requestLogger } from './plugins/request-logger.js'
import { requestTracing } from './plugins/request-tracing.js'
import { mcpTransportPlugin } from './plugins/mcp-transport.js'
import { closeDatabase } from '../common/database/mongo/mongo.js'

import { probes as probesRouter } from './probes/probes.js'

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
      }
    },
    router: {
      stripTrailingSlash: true
    }
  })

  await server.register([
    requestLogger,
    requestTracing,
    pulse,
    probesRouter,
    mcpTransportPlugin
  ])

  // graceful shutdown
  server.ext('onPostStop', async function stopServer () {
    const logger = createLogger()
    logger.info('Stopping server, closing database connections...')

    try {
      await closeDatabase()
      logger.info('Database connections closed successfully')
    } catch (error) {
      logger.error('Error closing database during server shutdown:', error)
    }
  })

  return server
}

async function startServer () {
  let server

  try {
    server = await createServer()
    await server.start()

    server.logger.info('Server started successfully')
    server.logger.info(
      `Access your backend on http://localhost:${config.get('port')}`
    )
  } catch (error) {
    const logger = createLogger()
    logger.info('Server failed to start :(')
    logger.error(error)

    await closeDatabase()
  }

  return server
}

export {
  startServer
}
