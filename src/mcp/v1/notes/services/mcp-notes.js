import { createDomainError } from '../../../../common/errors/domain-errors.js'
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
   * @throws {Error} When note data is invalid
   */

  async function createNote (noteData) {
    try {
      logger.debug('Creating new MCP note:', { title: noteData.title })

      if (!noteData.title || !noteData.content) {
        throw createDomainError('Title and content are required', 400, 'InvalidNoteDataError')
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

  async function getNoteById (noteId) {
    try {
      logger.debug('Retrieving MCP note by ID:', { noteId })

      if (!noteId) {
        throw createDomainError('Note ID is required', 400, 'InvalidNoteDataError')
      }

      const note = await mcpNoteRepository.findByNoteId(noteId)

      if (!note) {
        throw createDomainError(`MCP note with ID ${noteId} not found`, 404, 'NoteNotFoundError')
      }

      logger.info('MCP note retrieved successfully:', { noteId: note.noteId, title: note.title })
      return { details: note }
    } catch (error) {
      logger.error('Error retrieving MCP note by ID:', error)
      throw error
    }
  }

  async function getAllNotes () {
    try {
      logger.debug('Retrieving all MCP notes')
      const notes = await mcpNoteRepository.getAllNotes()

      logger.info('MCP notes retrieved successfully: ', { count: notes.length })

      // format each note as {details: note }
      const formattedNotes = []
      for (const note of notes) {
        formattedNotes.push({ details: note })
      }

      return formattedNotes
    } catch (error) {
      logger.error('Error retrieveing all MCP notes: ', error)
      throw error
    }
  }

  async function deleteByNoteId (noteId) {
    try {
      logger.debug('Deleting MCP note by ID:', { noteId })

      const note = await mcpNoteRepository.findByNoteId(noteId)

      if (!note) {
        throw createDomainError(`Note with note id ${noteId} does not exist`, 404, 'NoteNotFoundError')
      }

      await mcpNoteRepository.deleteByNoteId(noteId)

      logger.info('MCP note deleted successfully:', { noteId: note.noteId, title: note.title })
      return { details: note }
    } catch (error) {
      logger.error('Error retrieving MCP note by ID:', error)
      throw error
    }
  }

  return {
    createNote,
    getNoteById,
    getAllNotes,
    deleteByNoteId
  }
}

export { createMcpNoteService }
