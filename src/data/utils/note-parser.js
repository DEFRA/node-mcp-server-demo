import { NoteModel } from '../models/note.js'
import { InvalidNoteDataError } from '../../common/errors/domain-errors.js'
import { createLogger } from '../../common/logging/logger.js'

/**
 * Note Parser Utility
 * Handles parsing of note files and creating note models without using static methods
 */
class NoteParser {
  constructor() {
    this.logger = createLogger()
  }

  /**
   * Parse file content and create a note model
   * @param {string} content - File content to parse
   * @param {string} filename - Original filename (for error reporting)
   * @returns {NoteModel} Parsed note model
   */
  parseFileContent(content, filename = 'unknown') {
    try {
      if (!content || typeof content !== 'string') {
        throw new InvalidNoteDataError('Content is required and must be a string')
      }

      const lines = content.split('\n')
      
      // Find the separator line
      const separatorIndex = lines.findIndex(line => line.trim() === '---')
      if (separatorIndex === -1) {
        throw new InvalidNoteDataError('Invalid note format: missing separator "---"')
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
        throw new InvalidNoteDataError('Missing required field: ID')
      }
      if (!noteData.title) {
        throw new InvalidNoteDataError('Missing required field: TITLE')
      }

      return new NoteModel(noteData)
    } catch (error) {
      this.logger.error(`Error parsing note file ${filename}:`, error)
      
      if (error instanceof InvalidNoteDataError) {
        throw error
      }
      
      throw new InvalidNoteDataError(`Failed to parse note file ${filename}: ${error.message}`)
    }
  }

  /**
   * Create note model from document object
   * @param {Object} doc - Document object
   * @returns {NoteModel} Note model instance
   */
  createFromDocument(doc) {
    return new NoteModel(doc)
  }
}

export { NoteParser }
