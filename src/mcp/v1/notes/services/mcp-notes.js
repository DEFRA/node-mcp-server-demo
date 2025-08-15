import { createLogger } from '../../../../common/logging/logger.js'
import { createMcpNoteRepository } from '../../../../data/repositories/mcp-notes.js'
/**
 * Create a MCP Note service
 * @returns {object} MCP Note service object with methods
 */

function createMcpNoteService () {
  const logger = createLogger()
  const mcpNoteRepository = createMcpNoteRepository()

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
        throw Error('InvalidNoteDataError:Title and content are required')
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
        throw Error('InvalidNoteDataError: Note ID is required')
      }

      const note = await mcpNoteRepository.findByNoteId(noteId)

      if (!note) {
        throw Error(`NoteNotFoundError: MCP note with ID ${noteId} not found`)
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

  /**
 * Updates an existing MCP note.
 *
 * @param {string} noteId - The ID of the note to update.
 * @param {Object} updatedData - The fields to update (e.g., `title`, `content`).
 * @returns {Promise<Object>} The updated note.
 * @throws {Error} If the note does not exist or the update fails.
 */
  async function updateNote (noteId, updatedData) {
    try {
      logger.debug('Updating MCP note:', { noteId, updatedData })

      if (!noteId || !updatedData) {
        throw Error('InvalidNoteDataError: Note ID and content are required')
      }
      // checking if note exists
      const existingNote = await getNoteById(noteId)

      if (!existingNote) {
        throw Error(`NoteNotFoundError: MCP note with ID ${noteId} not found`)
      }

      // merge existing note content
      const mergedData = { ...existingNote.details, ...updatedData }

      const updatedNote = await mcpNoteRepository.updateNote(noteId, mergedData)

      logger.info('MCP note updated successfully:', { noteId: updatedNote.noteId, title: updatedNote.title })

      return { details: updatedNote }
    } catch (error) {
      logger.error('Error updating MCP note:', error)
      throw error
    }
  }

  async function deleteByNoteId (noteId) {
    try {
      logger.debug('Deleting MCP note by ID:', { noteId })

      const note = await mcpNoteRepository.findByNoteId(noteId)

      if (!note) {
        throw Error(`NoteNotFoundError:Note with note id ${noteId} does not exist`)
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
    updateNote,
    deleteByNoteId
  }
}

export { createMcpNoteService }
