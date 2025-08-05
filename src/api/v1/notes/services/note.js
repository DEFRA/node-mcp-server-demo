import { createInvalidNoteDataError } from '../../../../common/errors/domain-errors.js'
import { createLogger } from '../../../../common/logging/logger.js'

/**
 * Create a note service
 * @param {object} noteRepository - The note repository
 * @returns {object} Note service object with methods
 */
function createNoteService (noteRepository) {
  const logger = createLogger()

  /**
   * Create a new note
   * @param {Object} noteData - The note data
   * @param {string} noteData.title - The note title
   * @param {string} noteData.content - The note content
   * @returns {Promise<Object>} The created note
   * @throws {InvalidNoteDataError} When note data is invalid
   */
  async function createNote (noteData) {
    try {
      logger.debug('Creating new note:', { title: noteData.title })

      // Validate required fields
      if (!noteData.title || !noteData.content) {
        throw createInvalidNoteDataError('Title and content are required')
      }

      // Delegate to repository
      const note = await noteRepository.create(noteData)

      logger.info('Note created successfully:', { id: note.id, title: note.title })
      return {
        details: note
      }
    } catch (error) {
      logger.error('Error creating note:', error)
      throw error
    }
  }

  /**
   * Get a note by ID
   * @param {string} id - The note ID
   * @returns {Promise<Object>} The note
   * @throws {NoteNotFoundError} When note is not found
   */
  async function getNoteById (id) {
    try {
      logger.debug('Retrieving note by ID:', { id })

      if (!id) {
        throw createInvalidNoteDataError('Note ID is required')
      }

      const note = await noteRepository.findById(id)

      logger.debug('Note retrieved successfully:', { id: note.id, title: note.title })
      return {
        details: note
      }
    } catch (error) {
      logger.error('Error retrieving note:', error)
      throw error
    }
  }

  /**
   * Get all notes
   * @returns {Promise<Array>} Array of all notes
   */
  async function getAllNotes () {
    try {
      logger.debug('Retrieving all notes')

      const notes = await noteRepository.getAll()

      logger.info('Notes retrieved successfully:', { count: notes.length })

      const formattedNotes = []
      for (const note of notes) {
        formattedNotes.push({ details: note })
      }

      return formattedNotes
    } catch (error) {
      logger.error('Error retrieving notes:', error)
      throw error
    }
  }

  /**
   * Update a note
   * @param {string} id - The note ID
   * @param {Object} noteData - The updated note data
   * @returns {Promise<Object>} The updated note
   * @throws {NoteNotFoundError} When note is not found
   * @throws {InvalidNoteDataError} When note data is invalid
   */
  async function updateNote (id, noteData) {
    try {
      logger.debug('Updating note:', { id, title: noteData.title })

      if (!id) {
        throw createInvalidNoteDataError('Note ID is required')
      }

      const updatedNote = await noteRepository.update(id, noteData)

      logger.info('Note updated successfully:', { id: updatedNote.id, title: updatedNote.title })
      return {
        details: updatedNote
      }
    } catch (error) {
      logger.error('Error updating note:', error)
      throw error
    }
  }

  /**
   * Delete a note
   * @param {string} id - The note ID
   * @returns {Promise<void>}
   * @throws {NoteNotFoundError} When note is not found
   */
  async function deleteNote (id) {
    try {
      logger.debug('Deleting note:', { id })

      if (!id) {
        throw createInvalidNoteDataError('Note ID is required')
      }

      await noteRepository.delete(id)

      logger.info('Note deleted successfully:', { id })
    } catch (error) {
      logger.error('Error deleting note:', error)
      throw error
    }
  }

  return {
    createNote,
    getNoteById,
    getAllNotes,
    updateNote,
    deleteNote
  }
}

export { createNoteService }
