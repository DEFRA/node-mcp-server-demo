import Boom from '@hapi/boom'
import { 
  mcpRequestSchema,
  createNoteArgsSchema,
  getNoteArgsSchema,
  listNotesArgsSchema 
} from '../schemas/mcp.js'
import { McpProtocolError } from '../../../../common/errors/domain-errors.js'
import { createLogger } from '../../../../common/logging/logger.js'

/**
 * Handler for POST /api/v1/mcp
 * Handle MCP JSON-RPC requests
 *
 * @param {import('@hapi/hapi').Request} request - Hapi request object
 * @param {import('@hapi/hapi').ResponseToolkit} h - Hapi response toolkit
 * @returns {import('@hapi/hapi').ResponseObject} Response object
 */
async function handleMcpRequest(request, h) {
  const logger = createLogger()
  
  try {
    logger.debug('Handling MCP request')
    
    const payload = request.payload
    
    // Basic JSON-RPC validation
    if (!payload?.jsonrpc || !payload?.method) {
      return h.response({
        jsonrpc: '2.0',
        error: {
          code: -32600,
          message: 'Invalid Request'
        },
        id: payload?.id || null
      }).code(400)
    }

    // Get services from request context
    const mcpService = request.server.app.mcpService
    
    let result
    
    // Handle different MCP methods
    switch (payload.method) {
      case 'initialize':
        result = await mcpService.initialize(payload.params || {})
        break
        
      case 'notifications/initialized':
        // Initialization complete notification - no response needed
        return h.response().code(200)
        
      case 'tools/list':
        result = await mcpService.listTools()
        break
        
      case 'tools/call': {
        const toolName = payload.params?.name
        const toolArguments = payload.params?.arguments || {}
        
        // Validate tool arguments based on tool name
        await _validateToolArguments(toolName, toolArguments)
        
        result = await mcpService.callTool(toolName, toolArguments)
        break
      }
      
      default:
        return h.response({
          jsonrpc: '2.0',
          error: {
            code: -32601,
            message: 'Method not found'
          },
          id: payload.id
        }).code(404)
    }

    return h.response({
      jsonrpc: '2.0',
      result,
      id: payload.id
    }).code(200)
    
  } catch (error) {
    logger.error('Error handling MCP request:', error)
    
    // Handle domain-specific errors
    if (error instanceof McpProtocolError) {
      return h.response({
        jsonrpc: '2.0',
        error: {
          code: -32602,
          message: error.message
        },
        id: request.payload?.id || null
      }).code(400)
    }
    
    // Handle validation errors
    if (error.isJoi) {
      return h.response({
        jsonrpc: '2.0',
        error: {
          code: -32602,
          message: `Invalid params: ${error.details[0].message}`
        },
        id: request.payload?.id || null
      }).code(400)
    }
    
    // Generic error handling
    throw Boom.internal(`Failed to handle MCP request: ${error.message}`)
  }
}

/**
 * Validate tool arguments based on tool name
 * @private
 */
async function _validateToolArguments(toolName, args) {
  switch (toolName) {
    case 'create_note':
      await createNoteArgsSchema.validateAsync(args)
      break
    case 'get_note':
      await getNoteArgsSchema.validateAsync(args)
      break
    case 'list_notes':
      await listNotesArgsSchema.validateAsync(args)
      break
    default:
      throw new McpProtocolError(`Unknown tool: ${toolName}`)
  }
}

/**
 * MCP route definitions following the established pattern
 */
const mcpRoutes = [
  {
    method: 'POST',
    path: '/api/v1/mcp',
    handler: handleMcpRequest,
    options: {
      description: 'Handle MCP JSON-RPC requests',
      notes: 'Processes Model Context Protocol requests and returns appropriate responses',
      tags: ['api', 'mcp'],
      validate: {
        payload: mcpRequestSchema
      },
      payload: {
        parse: true,
        allow: 'application/json',
        maxBytes: 1048576 // 1MB limit
      }
    }
  }
]

export { mcpRoutes }
