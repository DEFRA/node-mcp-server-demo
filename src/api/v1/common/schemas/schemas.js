import Joi from 'joi'

/**
 * Common validation schemas for the application
 */

/**
 * Note ID validation schema
 * Validates the format: note_<timestamp>_<randomId>
 */
const noteId = Joi.string()
  .pattern(/^note_\d+_[a-z0-9]+$/)
  .min(20)
  .max(50)
  .required()
  .description('Unique note identifier in format: note_<timestamp>_<randomId>')

/**
 * Note title validation schema
 */
const noteTitle = Joi.string()
  .min(1)
  .max(255)
  .trim()
  .required()
  .description('The title of the note')

/**
 * Note content validation schema
 */
const noteContent = Joi.string()
  .allow('')
  .max(10000)
  .description('The content/body of the note')

/**
 * ISO date string validation
 */
const isoDate = Joi.string()
  .isoDate()
  .description('ISO 8601 date string')

/**
 * JSON-RPC 2.0 validation schemas
 */
const jsonRpcVersion = Joi.string()
  .valid('2.0')
  .required()
  .description('JSON-RPC protocol version')

const jsonRpcId = Joi.alternatives()
  .try(Joi.string(), Joi.number(), Joi.allow(null))
  .description('JSON-RPC request identifier')

const jsonRpcMethod = Joi.string()
  .min(1)
  .required()
  .description('JSON-RPC method name')

export {
  noteId,
  noteTitle,
  noteContent,
  isoDate,
  jsonRpcVersion,
  jsonRpcId,
  jsonRpcMethod
}
