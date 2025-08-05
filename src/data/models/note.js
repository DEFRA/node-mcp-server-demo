import { createInvalidNoteDataError } from '../../common/errors/domain-errors.js'

/**
 * Generate a unique ID for a note
 * @returns {string} Unique note ID
 */
function generateNoteId () {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 11)
  return `note_${timestamp}_${random}`
}

/**
 * Validate note data
 * @param {Object} data - Note data to validate
 * @throws {InvalidNoteDataError} When note data is invalid
 */
function validateNoteData (data) {
  if (!data.title || typeof data.title !== 'string') {
    throw createInvalidNoteDataError('Title is required and must be a string')
  }

  if (data.title.length > 255) {
    throw createInvalidNoteDataError('Title cannot exceed 255 characters')
  }

  if (typeof data.content !== 'string') {
    throw createInvalidNoteDataError('Content must be a string')
  }

  if (data.content.length > 10000) {
    throw createInvalidNoteDataError('Content cannot exceed 10000 characters')
  }
}

/**
 * Generate filename for a note
 * @param {string} id - Note ID
 * @param {string} title - Note title
 * @returns {string} Sanitized filename ending with .txt
 */
function generateNoteFilename (id, title) {
  // Sanitize title for filename
  const sanitizedTitle = title
    .replace(/[^a-zA-Z0-9\s]/g, '') // Remove special characters
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .toLowerCase()
    .substring(0, 50) // Limit length

  const titlePart = sanitizedTitle || 'untitled'
  return `${id}_${titlePart}.txt`
}

/**
 * Convert note to file content format
 * @param {Object} note - Note object
 * @returns {string} File content
 */
function noteToFileContent (note) {
  const header = `ID: ${note.id}
TITLE: ${note.title}
CREATED: ${note.createdAt.toISOString()}
---`

  return `${header}
${note.content}`
}

/**
 * Create a note object
 * @param {Object} data - Note data
 * @returns {Object} Note object with methods
 */
function createNote (data = {}) {
  const note = {
    _id: data._id || data.id || null,
    id: data.id || generateNoteId(),
    title: data.title || '',
    content: data.content || '',
    createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
    updatedAt: new Date()
  }

  if (!note._id) {
    note.createdAt = data.createdAt ? new Date(data.createdAt) : new Date()
  }

  // Validate the note data
  validateNoteData(note)

  return {
    ...note,

    /**
     * Generate filename for the note
     * @returns {string} Sanitized filename ending with .txt
     */
    generateFilename () {
      return generateNoteFilename(note.id, note.title)
    },

    /**
     * Convert note to file content format
     * @returns {string} File content
     */
    toFileContent () {
      return noteToFileContent(note)
    },

    /**
     * Convert note to simple object for API responses
     * @returns {object} Plain object representation
     */
    toJSON () {
      return {
        id: note.id,
        title: note.title,
        content: note.content,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt
      }
    }
  }
}

export {
  createNote,
  generateNoteId,
  validateNoteData,
  generateNoteFilename,
  noteToFileContent
}
