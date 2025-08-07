import { createInvalidNoteDataError } from '../../../../common/errors/domain-errors.js'
import { createLogger } from '../../../../common/logging/logger.js'

/**
 * Create a MCP Note service
 * @param {object} mcpNoteRepository - The MCP note repository
 * @returns {object} MCP Note service object with methods
 */

function createMcpNoteService (mcpNoteRepository) {
  const logger = createLogger()

  /**
   * Create a new MCP note
   * @param {Object} noteData - The note data
   * @param {string} noteData.title - The note title
   * @param {string} noteData.content - The note content
   * @returns {Promise<Object>} The created note
   * @throws {InvalidNoteDataError} When note data is invalid
   */

  async function createNote (noteData) {
    try {
      logger.debug('Creating new MCP note:', { title: noteData.title })

      if (!noteData.title || !noteData.content) {
        throw createInvalidNoteDataError('Title and content are required')
      }

      const note = await mcpNoteRepository.createNote(noteData)

      logger.info('MCP note created succefully:', {
        noteID: note.noteId,
        title: note.title,
      })

      return { details: note }
    } catch (error) {
      logger.error('Error createing MCP note: ', error)
      throw error
    }
  }

  return {
    createNote
  }
}

export { createMcpNoteService }
