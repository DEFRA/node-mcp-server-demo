import { InvalidNoteDataError, NoteNotFoundError } from '../../../../common/errors/domain-errors.js'
import { createLogger } from '../../../../common/logging/logger.js'

/**
 * Note Service
 * Handles note-related business logic using the repository pattern
 */
class NoteService {
  constructor(noteRepository) {
    this.noteRepository = noteRepository
    this.logger = createLogger()
  }

  /**
   * Create a new note
   * @param {Object} noteData - The note data
   * @param {string} noteData.title - The note title
   * @param {string} noteData.content - The note content
   * @returns {Promise<Object>} The created note
   * @throws {InvalidNoteDataError} When note data is invalid
   */
  async createNote(noteData) {
    try {
      this.logger.debug('Creating new note:', { title: noteData.title })
      
      // Validate required fields
      if (!noteData.title || !noteData.content) {
        throw new InvalidNoteDataError('Title and content are required')
      }

      // Delegate to repository
      const note = await this.noteRepository.create(noteData)
      
      this.logger.info('Note created successfully:', { id: note.id, title: note.title })
      return {
        details: note
      }
      
    } catch (error) {
      this.logger.error('Error creating note:', error)
      throw error
    }
  }

  /**
   * Get a note by ID
   * @param {string} id - The note ID
   * @returns {Promise<Object>} The note
   * @throws {NoteNotFoundError} When note is not found
   */
  async getNoteById(id) {
    try {
      this.logger.debug('Retrieving note by ID:', { id })
      
      if (!id) {
        throw new InvalidNoteDataError('Note ID is required')
      }

      const note = await this.noteRepository.findById(id)
      
      this.logger.debug('Note retrieved successfully:', { id: note.id, title: note.title })
      return {
        details: note
      }
      
    } catch (error) {
      this.logger.error('Error retrieving note:', error)
      throw error
    }
  }

  /**
   * Get all notes
   * @returns {Promise<Array>} Array of all notes
   */
  async getAllNotes() {
    try {
      this.logger.debug('Retrieving all notes')
      
      const notes = await this.noteRepository.getAll()
      
      this.logger.info('Notes retrieved successfully:', { count: notes.length })
      
      const formattedNotes = []
      for (const note of notes) {
        formattedNotes.push({ details: note })
      }
      
      return formattedNotes
      
    } catch (error) {
      this.logger.error('Error retrieving notes:', error)
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
  async updateNote(id, noteData) {
    try {
      this.logger.debug('Updating note:', { id, title: noteData.title })
      
      if (!id) {
        throw new InvalidNoteDataError('Note ID is required')
      }

      const updatedNote = await this.noteRepository.update(id, noteData)
      
      this.logger.info('Note updated successfully:', { id: updatedNote.id, title: updatedNote.title })
      return {
        details: updatedNote
      }
      
    } catch (error) {
      this.logger.error('Error updating note:', error)
      throw error
    }
  }

  /**
   * Delete a note
   * @param {string} id - The note ID
   * @returns {Promise<void>}
   * @throws {NoteNotFoundError} When note is not found
   */
  async deleteNote(id) {
    try {
      this.logger.debug('Deleting note:', { id })
      
      if (!id) {
        throw new InvalidNoteDataError('Note ID is required')
      }

      await this.noteRepository.delete(id)
      
      this.logger.info('Note deleted successfully:', { id })
      
    } catch (error) {
      this.logger.error('Error deleting note:', error)
      throw error
    }
  }
}

export { NoteService }
