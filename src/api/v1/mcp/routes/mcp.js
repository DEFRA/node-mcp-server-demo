import { createLogger } from '../../../../common/logging/logger.js'

/**
 * MCP route handlers
 * Handles HTTP endpoints for MCP protocol communication directly with the MCP server
 */

/**
 * Handle MCP JSON-RPC requests directly
 * @param {Object} mcpServer - The MCP server instance
 * @param {Object} request - The JSON-RPC request
 * @returns {Promise<Object>} The JSON-RPC response
 */
async function handleMcpRequest(mcpServer, request) {
  // Create a mock transport to handle the request
  const responsePromise = new Promise((resolve) => {
    const mockTransport = {
      start: () => Promise.resolve(),
      close: () => Promise.resolve(),
      send: (response) => {
        resolve(response)
      }
    }
    
    // Connect the server to our mock transport
    mcpServer.connect(mockTransport).then(() => {
      // Handle the request through the connected server
      // The server will call mockTransport.send() with the response
    })
  })
  
  return responsePromise
}

/**
 * Create MCP routes for Hapi server
 * @param {Object} mcpServer - The MCP server instance
 * @param {Object} noteService - The note service instance
 * @returns {Array} Array of Hapi route definitions
 */
function createMcpRoutes(mcpServer, noteService) {
  const logger = createLogger()

  return [
    {
      method: 'POST',
      path: '/mcp',
      handler: async (request, h) => {
        try {
          logger.debug('Handling MCP POST request')
          
          const payload = request.payload
          
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

          // Handle different MCP methods
          let response
          
          switch (payload.method) {
            case 'initialize':
              response = {
                jsonrpc: '2.0',
                result: {
                  protocolVersion: '2024-11-05',
                  capabilities: {
                    tools: {},
                    prompts: {},
                    resources: {}
                  },
                  serverInfo: {
                    name: 'notes-server',
                    version: '1.0.0'
                  }
                },
                id: payload.id
              }
              break
              
            case 'notifications/initialized':
              // Initialization complete notification - no response needed
              return h.response().code(200)
              
            case 'tools/list':
              response = {
                jsonrpc: '2.0',
                result: {
                  tools: [
                    {
                      name: 'create_note',
                      description: 'Create a new note with title and content',
                      inputSchema: {
                        type: 'object',
                        properties: {
                          title: {
                            type: 'string',
                            description: 'The title of the note'
                          },
                          content: {
                            type: 'string',
                            description: 'The content/body of the note'
                          }
                        },
                        required: ['title', 'content']
                      }
                    },
                    {
                      name: 'get_note',
                      description: 'Retrieve a note by its ID',
                      inputSchema: {
                        type: 'object',
                        properties: {
                          id: {
                            type: 'string',
                            description: 'The ID of the note to retrieve'
                          }
                        },
                        required: ['id']
                      }
                    },
                    {
                      name: 'list_notes',
                      description: 'List all available notes',
                      inputSchema: {
                        type: 'object',
                        properties: {}
                      }
                    }
                  ]
                },
                id: payload.id
              }
              break
              
            case 'tools/call': {
              // Handle tool calls by delegating to the actual service
              const toolName = payload.params?.name
              const toolArguments = payload.params?.arguments || {}
              
              if (!toolName) {
                response = {
                  jsonrpc: '2.0',
                  error: {
                    code: -32602,
                    message: 'Invalid params: tool name is required'
                  },
                  id: payload.id
                }
                break
              }
              
              try {
                let result
                
                switch (toolName) {
                  case 'create_note': {
                    const { title, content } = toolArguments
                    if (!title || !content) {
                      throw new Error('Title and content are required')
                    }
                    
                    const noteResult = await noteService.createNote({ title, content })
                    result = {
                      content: [{
                        type: 'text',
                        text: `✅ Note created successfully!

**Title:** ${noteResult.details.title}
**ID:** ${noteResult.details.id}
**Created:** ${noteResult.details.createdAt.toISOString()}`
                      }]
                    }
                    break
                  }
                  
                  case 'get_note': {
                    const { id } = toolArguments
                    if (!id) {
                      throw new Error('Note ID is required')
                    }
                    
                    const note = await noteService.getNoteById(id)
                    if (!note) {
                      result = {
                        content: [{
                          type: 'text',
                          text: `❌ Note with ID "${id}" not found`
                        }],
                        isError: true
                      }
                    } else {
                      result = {
                        content: [{
                          type: 'text',
                          text: `📝 **${note.details.title}**

${note.details.content}

---
**ID:** ${note.details.id}
**Created:** ${note.details.createdAt.toISOString()}`
                        }]
                      }
                    }
                    break
                  }
                  
                  case 'list_notes': {
                    const notes = await noteService.getAllNotes()
                    
                    if (notes.length === 0) {
                      result = {
                        content: [{
                          type: 'text',
                          text: '📝 No notes found. Create your first note using the create_note tool!'
                        }]
                      }
                    } else {
                      const notesList = notes.map((note, index) => 
                        `${index + 1}. **${note.details.title}** (ID: ${note.details.id})
   Created: ${note.details.createdAt.toISOString()}
   Preview: ${note.details.content.substring(0, 80)}${note.details.content.length > 80 ? '...' : ''}`
                      ).join('\n\n')
                      
                      result = {
                        content: [{
                          type: 'text',
                          text: `📝 **Found ${notes.length} note(s):**

${notesList}

💡 Use get_note with an ID to view the full content of any note.`
                        }]
                      }
                    }
                    break
                  }
                  
                  default:
                    throw new Error(`Unknown tool: ${toolName}`)
                }
                
                response = {
                  jsonrpc: '2.0',
                  result,
                  id: payload.id
                }
                
              } catch (error) {
                logger.error(`Error executing tool ${toolName}:`, error)
                response = {
                  jsonrpc: '2.0',
                  result: {
                    content: [{
                      type: 'text',
                      text: `❌ Error executing ${toolName}: ${error.message}`
                    }],
                    isError: true
                  },
                  id: payload.id
                }
              }
              break
            }
              
            default:
              response = {
                jsonrpc: '2.0',
                error: {
                  code: -32601,
                  message: 'Method not found'
                },
                id: payload.id
              }
          }
          
          return h.response(response)
            .type('application/json')
          
        } catch (error) {
          logger.error('Error handling MCP POST request:', error)
          return h.response({
            jsonrpc: '2.0',
            error: {
              code: -32603,
              message: 'Internal server error'
            },
            id: request.payload?.id || null
          }).code(500)
        }
      },
      options: {
        description: 'Handle MCP client requests',
        tags: ['mcp'],
        payload: {
          parse: true,
          allow: 'application/json'
        }
      }
    },
    {
      method: 'GET',
      path: '/mcp',
      handler: async (request, h) => {
        try {
          logger.debug('Handling MCP GET request - returning server info')
          
          // Return basic server information for GET requests
          return h.response({
            name: 'notes-server',
            version: '1.0.0',
            protocol: 'mcp',
            description: 'MCP server for note management'
          }).type('application/json')
          
        } catch (error) {
          logger.error('Error handling MCP GET request:', error)
          return h.response('Internal server error').code(500)
        }
      },
      options: {
        description: 'Handle MCP server info requests',
        tags: ['mcp']
      }
    }
  ]
}

export { createMcpRoutes }
