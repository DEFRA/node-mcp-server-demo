import { createLogger } from '../../common/logging/logger.js'
import { InvalidNoteDataError } from '../../common/errors/domain-errors.js'

/**
 * Note Model for file-based storage
 * Handles note structure, validation, and file format conversion
 */
class NoteModel {
  constructor(data = {}) {
    this._id = data._id || data.id || null
    this.id = data.id || this._generateId()
    this.title = data.title || ''
    this.content = data.content || ''
    this.createdAt = data.createdAt ? new Date(data.createdAt) : new Date()
    this.updatedAt = new Date()
    
    if (!this._id) {
      this.createdAt = data.createdAt ? new Date(data.createdAt) : new Date()
    }
    
    this.logger = createLogger()
    this._validate()
  }

  /**
   * Validate note data
   * @private
   */
  _validate() {
    if (!this.title || typeof this.title !== 'string') {
      throw new InvalidNoteDataError('Title is required and must be a string')
    }
    
    if (this.title.length > 255) {
      throw new InvalidNoteDataError('Title cannot exceed 255 characters')
    }
    
    if (typeof this.content !== 'string') {
      throw new InvalidNoteDataError('Content must be a string')
    }
    
    if (this.content.length > 10000) {
      throw new InvalidNoteDataError('Content cannot exceed 10000 characters')
    }
  }

  /**
   * Generate a unique ID for the note
   * @private
   * @returns {string} Unique note ID
   */
  _generateId() {
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
   * Convert note to simple object for API responses
   * @returns {object} Plain object representation
   */
  toJSON() {
    return {
      id: this.id,
      title: this.title,
      content: this.content,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    }
  }
}

export { NoteModel }
