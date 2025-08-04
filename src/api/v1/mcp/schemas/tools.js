import Joi from 'joi'

/**
 * MCP Tool Schema Definitions
 * Uses Joi for validation with JSON Schema definitions for MCP protocol compliance
 */

/**
 * Joi schemas for runtime validation
 */
const createNoteJoiSchema = Joi.object({
  title: Joi.string().min(1).max(255).required().description('The title of the note'),
  content: Joi.string().max(10000).required().description('The content/body of the note')
}).required()

const getNoteJoiSchema = Joi.object({
  noteId: Joi.string().pattern(/^note_\d+_[a-z0-9]+$/).required().description('The unique identifier of the note')
}).required()

const listNotesJoiSchema = Joi.object({}).required()

/**
 * JSON Schema definitions for MCP protocol compliance
 * These must match the Joi schemas above but in JSON Schema format
 */
const createNoteSchema = {
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

const getNoteSchema = {
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

const listNotesSchema = {
  type: 'object',
  properties: {},
  additionalProperties: false
}

/**
 * Complete tool definitions with schemas
 */
const toolDefinitions = [
  {
    name: 'create_note',
    description: 'Create a new note with title and content',
    inputSchema: createNoteSchema
  },
  {
    name: 'get_note',
    description: 'Retrieve a note by its unique ID',
    inputSchema: getNoteSchema
  },
  {
    name: 'list_notes',
    description: 'List all available notes with their metadata',
    inputSchema: listNotesSchema
  }
]

export {
  createNoteJoiSchema,
  getNoteJoiSchema,
  listNotesJoiSchema,
  createNoteSchema,
  getNoteSchema,
  listNotesSchema,
  toolDefinitions
}
