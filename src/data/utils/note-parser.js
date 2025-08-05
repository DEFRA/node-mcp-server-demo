import { createNote } from '../models/note.js'
import { createInvalidNoteDataError } from '../../common/errors/domain-errors.js'
import { createLogger } from '../../common/logging/logger.js'

/**
 * Parse file content and create a note model
 * @param {string} content - File content to parse
 * @param {string} filename - Original filename (for error reporting)
 * @returns {object} Parsed note object
 */
function parseFileContent (content, filename = 'unknown') {
  const logger = createLogger()

  try {
    if (!content || typeof content !== 'string') {
      throw createInvalidNoteDataError('Content is required and must be a string')
    }

    const lines = content.split('\n')

    // Find the separator line
    const separatorIndex = lines.findIndex(line => line.trim() === '---')
    if (separatorIndex === -1) {
      throw createInvalidNoteDataError('Invalid note format: missing separator "---"')
    }

    // Parse header
    const headerLines = lines.slice(0, separatorIndex)
    const noteData = {}

    for (const line of headerLines) {
      if (line.startsWith('ID: ')) {
        noteData.id = line.substring(4).trim()
      } else if (line.startsWith('TITLE: ')) {
        noteData.title = line.substring(7).trim()
      } else if (line.startsWith('CREATED: ')) {
        noteData.createdAt = new Date(line.substring(9).trim())
      }
    }

    // Parse content (everything after separator)
    noteData.content = lines.slice(separatorIndex + 1).join('\n')

    // Validate required fields
    if (!noteData.id) {
      throw createInvalidNoteDataError('Missing required field: ID')
    }
    if (!noteData.title) {
      throw createInvalidNoteDataError('Missing required field: TITLE')
    }

    return createNote(noteData)
  } catch (error) {
    logger.error(`Error parsing note file ${filename}:`, error)

    throw createInvalidNoteDataError(`Failed to parse note file ${filename}: ${error.message}`)
  }
}

/**
 * Create note from document object
 * @param {Object} doc - Document object
 * @returns {object} Note object
 */
function createNoteFromDocument (doc) {
  return createNote(doc)
}

export {
  parseFileContent,
  createNoteFromDocument
}
