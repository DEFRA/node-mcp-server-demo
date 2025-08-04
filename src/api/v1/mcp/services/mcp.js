import { NoteNotFoundError, McpProtocolError } from '../../../../common/errors/domain-errors.js'
import { createLogger } from '../../../../common/logging/logger.js'
import { toolDefinitions, createNoteJoiSchema, getNoteJoiSchema, listNotesJoiSchema } from '../schemas/tools.js'

/**
 * MCP Service
 * Handles MCP protocol business logic and tool execution
 */
class McpService {
  constructor(noteService) {
    this.noteService = noteService
    this.logger = createLogger()
  }

  /**
   * Handle MCP initialize method
   * @param {Object} params - Initialize parameters
   * @returns {Object} Initialize response
   */
  async initialize(params) {
    this.logger.info('MCP initialize request received')
    
    const initializeResponse = {
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
    }
    
    return initializeResponse
  }

  /**
   * Handle MCP tools/list method
   * @returns {Object} Tools list response
   */
  async listTools() {
    this.logger.debug('MCP tools/list request received')
    
    const toolsResponse = {
      tools: toolDefinitions
    }
    
    return toolsResponse
  }

  /**
   * Handle MCP tools/call method
   * @param {string} toolName - Name of the tool to execute
   * @param {Object} toolArguments - Arguments for the tool
   * @returns {Object} Tool execution result
   */
  async callTool(toolName, toolArguments = {}) {
    this.logger.info(`Executing MCP tool: ${toolName}`)
    
    try {
      switch (toolName) {
        case 'create_note':
          return await this._executeCreateNote(toolArguments)
        case 'get_note':
          return await this._executeGetNote(toolArguments)
        case 'list_notes':
          return await this._executeListNotes(toolArguments)
        default:
          throw new McpProtocolError(`Unknown tool: ${toolName}`)
      }
    } catch (error) {
      this.logger.error(`Error executing tool ${toolName}:`, error)
      
      if (error instanceof NoteNotFoundError || error instanceof McpProtocolError) {
        const errorResponse = {
          content: [{
            type: 'text',
            text: `❌ ${error.message}`
          }],
          isError: true
        }
        
        return errorResponse
      }
      
      const unexpectedErrorResponse = {
        content: [{
          type: 'text',
          text: `❌ Unexpected error: ${error.message}`
        }],
        isError: true
      }
      
      return unexpectedErrorResponse
    }
  }

  /**
   * Execute create_note tool
   * @private
   */
  async _executeCreateNote(args) {
    // Validate arguments using Joi schema
    const { error, value } = createNoteJoiSchema.validate(args)
    if (error) {
      throw new McpProtocolError(`Invalid arguments for create_note: ${error.message}`)
    }
    
    const { title, content } = value
    
    const noteResult = await this.noteService.createNote({ title, content })
    
    this.logger.info(`Note created successfully: ${noteResult.details.id}`)
    
    const responseText = `✅ **Note created successfully!**

**Title:** ${noteResult.details.title}
**ID:** ${noteResult.details.id}
**Created:** ${noteResult.details.createdAt.toISOString()}

The note has been saved and can be retrieved using the get_note tool with ID: ${noteResult.details.id}`
    
    const toolResponse = {
      content: [{
        type: 'text',
        text: responseText
      }]
    }
    
    return toolResponse
  }

  /**
   * Execute get_note tool
   * @private
   */
  async _executeGetNote(args) {
    // Validate arguments using Joi schema
    const { error, value } = getNoteJoiSchema.validate(args)
    if (error) {
      throw new McpProtocolError(`Invalid arguments for get_note: ${error.message}`)
    }
    
    const { noteId } = value
    
    const noteResult = await this.noteService.getNoteById(noteId)
    
    if (!noteResult) {
      throw new NoteNotFoundError(noteId)
    }
    
    this.logger.info(`Note retrieved successfully: ${noteId}`)
    
    const responseText = `📝 **Note Details**

**Title:** ${noteResult.details.title}
**ID:** ${noteResult.details.id}
**Created:** ${noteResult.details.createdAt.toISOString()}

**Content:**
${noteResult.details.content}`
    
    const toolResponse = {
      content: [{
        type: 'text',
        text: responseText
      }]
    }
    
    return toolResponse
  }

  /**
   * Execute list_notes tool
   * @private
   */
  async _executeListNotes(args) {
    // Validate arguments using Joi schema
    const { error } = listNotesJoiSchema.validate(args)
    if (error) {
      throw new McpProtocolError(`Invalid arguments for list_notes: ${error.message}`)
    }
    
    const notes = await this.noteService.getAllNotes()
    
    if (notes.length === 0) {
      const emptyResponseText = '📝 No notes found. Create your first note using the create_note tool!'
      
      const emptyToolResponse = {
        content: [{
          type: 'text',
          text: emptyResponseText
        }]
      }
      
      return emptyToolResponse
    }
    
    const notesList = notes.map((note, index) => 
      `${index + 1}. **${note.details.title}** (ID: ${note.details.id})
   Created: ${note.details.createdAt.toISOString()}
   Preview: ${note.details.content.substring(0, 80)}${note.details.content.length > 80 ? '...' : ''}`
    ).join('\n\n')
    
    this.logger.info(`Listed ${notes.length} notes`)
    
    const responseText = `📝 **Found ${notes.length} note(s):**

${notesList}

💡 Use get_note with an ID to view the full content of any note.`
    
    const toolResponse = {
      content: [{
        type: 'text',
        text: responseText
      }]
    }
    
    return toolResponse
  }
}

export { McpService }
