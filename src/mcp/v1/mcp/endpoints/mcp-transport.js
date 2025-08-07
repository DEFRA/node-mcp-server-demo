import { randomUUID } from 'crypto'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js'
import { registerMcpTools } from '../services/mcp-tools.js'
import { createLogger } from '../../../../common/logging/logger.js'

// Session storage - in production, consider Redis or database
const transports = {}
/**
 * Handler for DELETE requests - MCP session termination
 *
 * @param {import('@hapi/hapi').Request} request - Hapi request object
 * @param {import('@hapi/hapi').ResponseToolkit} h - Hapi response toolkit
 * @returns {import('@hapi/hapi').ResponseObject} Response object
 */
async function handleMcpDelete (request, h) {
  const logger = createLogger()
  const sessionId = request.headers['mcp-session-id']

  if (!sessionId || !transports[sessionId]) {
    return h.response({
      error: 'Invalid or missing session ID',
      statusCode: 400
    }).code(400)
  }

  const transport = transports[sessionId]
  logger.info('Terminating MCP session', { sessionId })

  try {
    // Close the transport/session
    if (typeof transport.close === 'function') {
      await transport.close()
    }
    delete transports[sessionId]
    logger.info('MCP session terminated', { sessionId })
    return h.response({
      message: 'MCP session terminated successfully',
      statusCode: 200
    }).code(200)
  } catch (error) {
    logger.error('Error terminating MCP session:', error)
    return h.response({
      error: 'Internal server error',
      statusCode: 500
    }).code(500)
  }
}

/**
 * Handler for MCP transport requests - POST method
 * Implements the official StreamableHTTPServerTransport pattern from MCP SDK
 *
 * @param {import('@hapi/hapi').Request} request - Hapi request object
 * @param {import('@hapi/hapi').ResponseToolkit} h - Hapi response toolkit
 * @returns {import('@hapi/hapi').ResponseObject} Response object
 */
async function handleMcpTransport (request, h) {
  const logger = createLogger()

  // Check for existing session ID
  const sessionId = request.headers['mcp-session-id']
  let transport

  try {
    if (sessionId && transports[sessionId]) {
      // Reuse existing transport
      transport = transports[sessionId]
      logger.debug('Reusing existing MCP session', JSON.stringify({ sessionId }))
    } else if (!sessionId && isInitializeRequest(request.payload)) {
      // New initialization request - create new session
      logger.info('Creating new MCP session for initialize request')

      // Check if we're in production environment
      const isProduction = process.env.NODE_ENV === 'production'

      let initializedSessionId = null
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (newSessionId) => {
          // Store the transport by session ID
          transports[newSessionId] = transport
          initializedSessionId = newSessionId
          const sessionIdObj = { sessionId: newSessionId }
          logger.info(`MCP session initialized  ${JSON.stringify(sessionIdObj)}`)
        },
        // Only enable DNS rebinding protection in production
        // This allows MCP inspector and other development tools to work properly
        enableDnsRebindingProtection: isProduction,
        allowedHosts: [
          '127.0.0.1',                           // Local development
          'localhost',                           // Local development
          'localhost:3000',                      // Local development with port
          '0.0.0.0',                            // Docker container binding
          '0.0.0.0:3000',                       // Docker container with port
          'node-mcp-server-demo-development',    // Docker container name
          'node-mcp-server-demo-development:3000' // Docker container name with port
          // Add your production domains here, e.g.:
          // 'your-domain.com',
          // 'api.your-domain.com'
        ],
        allowedOrigins: [
          'http://localhost:3000',               // Local development
          'http://127.0.0.1:3000',              // Local development
          'http://0.0.0.0:3000',                // Docker container
          'http://localhost:6274',              // mcp inspector
          'http://localhost:6277',              // mcp inspector
          'http://node-mcp-server-demo-development:3000', // Docker inter-container
          // Allow undefined/null origins for development tools like MCP inspector
          ...(isProduction ? [] : [null, undefined, ''])
          // Add your production origins here, e.g.:
          // 'https://your-domain.com',
          // 'https://www.your-domain.com'
        ]
      })

      // Clean up transport when closed
      transport.onclose = () => {
        if (transport.sessionId) {
          delete transports[transport.sessionId]
          logger.info('MCP session closed', JSON.stringify({ sessionId: transport.sessionId }))
        }
      }

      // Create MCP server instance
      const mcpServer = new McpServer({
        name: 'notes-server',
        version: '1.0.0'
      })

      // Register our tools with the MCP server
      await registerMcpTools(mcpServer, request.server.app.mcpNoteService)

      // Connect to the MCP server
      await mcpServer.connect(transport)

      // Set the session ID header for the client after initialization
      if (initializedSessionId) {
        request.raw.res.setHeader('Mcp-Session-Id', initializedSessionId)
      }
    } else {
      // Invalid request
      return h.response({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Bad Request: No valid session ID provided'
        },
        id: null
      }).code(400)
    }

    // Handle the request using the transport
    await transport.handleRequest(request.raw.req, request.raw.res, request.payload)

    // Return h.abandon() since the transport has handled the response
    return h.abandon
  } catch (error) {
    logger.error('Error in MCP transport handler:', error)

    // If response hasn't been sent yet, send error response
    if (!request.raw.res.headersSent) {
      return h.response({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: `Internal error: ${error.message}`
        },
        id: request.payload?.id || null
      }).code(500)
    }

    // Response already sent, can't do anything
    return h.abandon
  }
}

/**
 * Handler for GET requests - Server-to-client notifications via SSE
 */
async function handleMcpGet (request, h) {
  const logger = createLogger()
  const sessionId = request.headers['mcp-session-id']

  if (!sessionId || !transports[sessionId]) {
    return h.response('Invalid or missing session ID').code(400)
  }

  if (!sessionId || !transports[sessionId]) {
    return h.response('Invalid or missing session ID').code(400)
  }

  const transport = transports[sessionId]
  logger.debug('Handling MCP DELETE request for session termination', { sessionId })

  try {
    await transport.handleRequest(request.raw.req, request.raw.res)
    return h.abandon
  } catch (error) {
    logger.error('Error in MCP DELETE handler:', error)
    if (!request.raw.res.headersSent) {
      return h.response('Internal server error').code(500)
    }
    return h.abandon
  }
}

/**
 * MCP transport routes following the official SDK specification
 * Supports POST (client-to-server), GET (SSE), and DELETE (session termination)
 */
const mcpTransportRoutes = [
  {
    method: 'POST',
    path: '/mcp',
    handler: handleMcpTransport,
    options: {
      description: 'Handle MCP transport requests (POST)',
      notes: 'Processes client-to-server MCP requests using StreamableHTTPServerTransport',
      tags: ['api', 'mcp', 'transport'],
      payload: {
        parse: true,
        allow: 'application/json'
      }
    }
  },
  {
    method: 'GET',
    path: '/mcp',
    handler: handleMcpGet,
    options: {
      description: 'Handle MCP transport requests (GET)',
      notes: 'Handles server-to-client notifications via SSE',
      tags: ['api', 'mcp', 'transport', 'sse'],
    }
  },
  {
    method: 'DELETE',
    path: '/mcp',
    handler: handleMcpDelete,
    options: {
      description: 'Handle MCP transport requests (DELETE)',
      notes: 'Handles MCP session termination',
      tags: ['api', 'mcp', 'transport', 'session']
    }
  }
]

export { mcpTransportRoutes, handleMcpTransport, handleMcpDelete }
