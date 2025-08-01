import { createLogger } from '../../common/logging/logger.js'

/**
 * Simple note model for file-based storage
 * Handles basic note structure and file format conversion
 */
class NoteModel {
  constructor(data = {}) {
    this.id = data.id || this.generateId()
    this.title = data.title || ''
    this.content = data.content || ''
    this.createdAt = data.createdAt || new Date()
    this.logger = createLogger()
  }

  /**
   * Generate a unique ID for the note
   * @returns {string} Unique note ID
   */
  generateId() {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 11)
    return `note_${timestamp}_${random}`
  }

  /**
   * Generate filename for the note
   * @returns {string} Sanitized filename ending with .txt
   */
  generateFilename() {
    // Sanitize title for filename
    const sanitizedTitle = this.title
      .replace(/[^a-zA-Z0-9\s]/g, '') // Remove special characters
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .toLowerCase()
      .substring(0, 50) // Limit length

    const titlePart = sanitizedTitle || 'untitled'
    return `${this.id}_${titlePart}.txt`
  }

  /**
   * Convert note to file content format
   * Simple format: title on first line, then content
   * @returns {string} File content
   */
  toFileContent() {
    const header = `ID: ${this.id}
TITLE: ${this.title}
CREATED: ${this.createdAt.toISOString()}
---`

    return `${header}
${this.content}`
  }

  /**
   * Create note model from file content
   * @param {string} content - File content to parse
   * @param {string} filename - Original filename (for error reporting)
   * @returns {NoteModel} Parsed note model
   */
  static fromFileContent(content, filename = 'unknown') {
    try {
      if (!content || typeof content !== 'string') {
        throw new Error('Content is required and must be a string')
      }

      const lines = content.split('\n')
      
      // Find the separator line
      const separatorIndex = lines.findIndex(line => line.trim() === '---')
      if (separatorIndex === -1) {
        throw new Error('Invalid note format: missing separator "---"')
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
        throw new Error('Missing required field: ID')
      }
      if (!noteData.title) {
        throw new Error('Missing required field: TITLE')
      }

      return new NoteModel(noteData)
    } catch (error) {
      const logger = createLogger()
      logger.error(`Error parsing note file ${filename}:`, error)
      throw new Error(`Failed to parse note file ${filename}: ${error.message}`)
    }
  }

  /**
   * Basic validation of note data
   * @throws {Error} If validation fails
   */
  validate() {
    if (!this.title || typeof this.title !== 'string' || this.title.trim().length === 0) {
      throw new Error('Note title is required and must be a non-empty string')
    }
    
    if (typeof this.content !== 'string') {
      throw new Error('Note content must be a string')
    }

    if (!this.id || typeof this.id !== 'string') {
      throw new Error('Note ID is required and must be a string')
    }

    if (!(this.createdAt instanceof Date) || isNaN(this.createdAt.getTime())) {
      throw new Error('Note createdAt must be a valid Date')
    }
  }

  /**
   * Convert note to simple object for API responses
   * @returns {object} Plain object representation
   */
  toJSON() {
    return {
      id: this.id,
      title: this.title,
      content: this.content,
      createdAt: this.createdAt.toISOString()
    }
  }
}

export { NoteModel }
