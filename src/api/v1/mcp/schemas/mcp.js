import Joi from 'joi'
import { noteId, noteTitle, noteContent, jsonRpcVersion, jsonRpcId, jsonRpcMethod } from '../../common/schemas/schemas.js'

/**
 * MCP protocol validation schemas
 */

/**
 * MCP initialize request schema
 */
const initializeRequestSchema = Joi.object({
  jsonrpc: jsonRpcVersion,
  id: jsonRpcId,
  method: Joi.string().valid('initialize').required(),
  params: Joi.object({
    protocolVersion: Joi.string().required(),
    capabilities: Joi.object().default({}),
    clientInfo: Joi.object({
      name: Joi.string().required(),
      version: Joi.string().required()
    }).required()
  }).required()
}).required()

/**
 * MCP tools/list request schema
 */
const toolsListRequestSchema = Joi.object({
  jsonrpc: jsonRpcVersion,
  id: jsonRpcId,
  method: Joi.string().valid('tools/list').required(),
  params: Joi.object().default({})
}).required()

/**
 * MCP tools/call request schema
 */
const toolsCallRequestSchema = Joi.object({
  jsonrpc: jsonRpcVersion,
  id: jsonRpcId,
  method: Joi.string().valid('tools/call').required(),
  params: Joi.object({
    name: Joi.string().required(),
    arguments: Joi.object().default({})
  }).required()
}).required()

/**
 * MCP notifications/initialized request schema
 */
const notificationsInitializedSchema = Joi.object({
  jsonrpc: jsonRpcVersion,
  method: Joi.string().valid('notifications/initialized').required()
}).required()

/**
 * Create note tool arguments schema
 */
const createNoteArgsSchema = Joi.object({
  title: noteTitle,
  content: noteContent
}).required()

/**
 * Get note tool arguments schema
 */
const getNoteArgsSchema = Joi.object({
  noteId: noteId
}).required()

/**
 * List notes tool arguments schema
 */
const listNotesArgsSchema = Joi.object({}).optional()

/**
 * Generic MCP request schema for initial validation
 */
const mcpRequestSchema = Joi.object({
  jsonrpc: jsonRpcVersion,
  method: jsonRpcMethod,
  id: jsonRpcId,
  params: Joi.object().optional()
}).required()

export {
  initializeRequestSchema,
  toolsListRequestSchema,
  toolsCallRequestSchema,
  notificationsInitializedSchema,
  createNoteArgsSchema,
  getNoteArgsSchema,
  listNotesArgsSchema,
  mcpRequestSchema
}
