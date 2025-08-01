import { NoteNotFoundError, McpProtocolError } from '../../../../common/errors/domain-errors.js'
import { createLogger } from '../../../../common/logging/logger.js'

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
    
    return {
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
  }

  /**
   * Handle MCP tools/list method
   * @returns {Object} Tools list response
   */
  async listTools() {
    this.logger.debug('MCP tools/list request received')
    
    return {
      tools: [
        {
          name: 'create_note',
          description: 'Create a new note with title and content',
          inputSchema: {
            type: 'object',
            properties: {
              title: {
                type: 'string',
                minLength: 1,
                maxLength: 255,
                description: 'The title of the note'
              },
              content: {
                type: 'string',
                maxLength: 10000,
                description: 'The content/body of the note'
              }
            },
            required: ['title', 'content'],
            additionalProperties: false
          }
        },
        {
          name: 'get_note',
          description: 'Retrieve a note by its unique ID',
          inputSchema: {
            type: 'object',
            properties: {
              noteId: {
                type: 'string',
                pattern: '^note_\\d+_[a-z0-9]+$',
                description: 'The unique identifier of the note'
              }
            },
            required: ['noteId'],
            additionalProperties: false
          }
        },
        {
          name: 'list_notes',
          description: 'List all available notes with their metadata',
          inputSchema: {
            type: 'object',
            properties: {},
            additionalProperties: false
          }
        }
      ]
    }
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
        return {
          content: [{
            type: 'text',
            text: `❌ ${error.message}`
          }],
          isError: true
        }
      }
      
      return {
        content: [{
          type: 'text',
          text: `❌ Unexpected error: ${error.message}`
        }],
        isError: true
      }
    }
  }

  /**
   * Execute create_note tool
   * @private
   */
  async _executeCreateNote(args) {
    const { title, content } = args
    
    const noteResult = await this.noteService.createNote({ title, content })
    
    this.logger.info(`Note created successfully: ${noteResult.details.id}`)
    
    return {
      content: [{
        type: 'text',
        text: `✅ **Note created successfully!**

**Title:** ${noteResult.details.title}
**ID:** ${noteResult.details.id}
**Created:** ${noteResult.details.createdAt.toISOString()}

The note has been saved and can be retrieved using the get_note tool with ID: ${noteResult.details.id}`
      }]
    }
  }

  /**
   * Execute get_note tool
   * @private
   */
  async _executeGetNote(args) {
    const { noteId } = args
    
    const noteResult = await this.noteService.getNoteById(noteId)
    
    if (!noteResult) {
      throw new NoteNotFoundError(noteId)
    }
    
    this.logger.info(`Note retrieved successfully: ${noteId}`)
    
    return {
      content: [{
        type: 'text',
        text: `📝 **Note Details**

**Title:** ${noteResult.details.title}
**ID:** ${noteResult.details.id}
**Created:** ${noteResult.details.createdAt.toISOString()}

**Content:**
${noteResult.details.content}`
      }]
    }
  }

  /**
   * Execute list_notes tool
   * @private
   */
  async _executeListNotes(args) {
    const notes = await this.noteService.getAllNotes()
    
    if (notes.length === 0) {
      return {
        content: [{
          type: 'text',
          text: '📝 No notes found. Create your first note using the create_note tool!'
        }]
      }
    }
    
    const notesList = notes.map((note, index) => 
      `${index + 1}. **${note.details.title}** (ID: ${note.details.id})
   Created: ${note.details.createdAt.toISOString()}
   Preview: ${note.details.content.substring(0, 80)}${note.details.content.length > 80 ? '...' : ''}`
    ).join('\n\n')
    
    this.logger.info(`Listed ${notes.length} notes`)
    
    return {
      content: [{
        type: 'text',
        text: `📝 **Found ${notes.length} note(s):**

${notesList}

💡 Use get_note with an ID to view the full content of any note.`
      }]
    }
  }
}

export { McpService }
