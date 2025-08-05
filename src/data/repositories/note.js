import { createNote } from '../models/note.js'
import { parseFileContent } from '../utils/note-parser.js'
import { createFileManager } from '../../common/filesystem/file-manager.js'
import { createNoteNotFoundError, createFileOperationError } from '../../common/errors/domain-errors.js'
import { createLogger } from '../../common/logging/logger.js'

/**
 * Create a file-based note repository
 * @param {string} notesDirectory - Directory for storing notes
 * @returns {object} Repository object with methods
 */
function createFileNoteRepository (notesDirectory) {
  const fileManager = createFileManager(notesDirectory)
  const logger = createLogger()

  /**
   * Create a new note
   * @param {Object} noteData - The note data
   * @returns {Promise<Object>} The created note
   * @throws {FileOperationError} When file operations fail
   */
  async function create (noteData) {
    try {
      const note = createNote(noteData)
      const fileName = `${note.id}.md`

      await fileManager.writeFile(fileName, note.toFileContent())

      logger.debug('Note created in repository:', { id: note.id, fileName })
      return note.toJSON()
    } catch (error) {
      logger.error('Failed to create note:', error)
      throw createFileOperationError(`Failed to create note: ${error.message}`)
    }
  }

  /**
   * Find a note by ID
   * @param {string} id - The note ID
   * @returns {Promise<Object>} The note
   * @throws {NoteNotFoundError} When note is not found
   * @throws {FileOperationError} When file operations fail
   */
  async function findById (id) {
    try {
      const fileName = `${id}.md`

      if (!(await fileManager.fileExists(fileName))) {
        throw createNoteNotFoundError(`Note with ID ${id} not found`)
      }

      const fileContent = await fileManager.readFile(fileName)
      const note = parseFileContent(fileContent, fileName)

      logger.debug('Note found in repository:', { id: note.id, fileName })
      return note.toJSON()
    } catch (error) {
      logger.error('Failed to find note in repository:', error)
      throw createFileOperationError(`Failed to read note: ${error.message}`)
    }
  }

  /**
   * Get all notes
   * @returns {Promise<Array>} Array of all notes
   * @throws {FileOperationError} When file operations fail
   */
  async function getAll () {
    try {
      const files = await fileManager.listFiles('.', '.md')
      const notes = []

      for (const fileName of files) {
        try {
          const fileContent = await fileManager.readFile(fileName)
          const note = parseFileContent(fileContent, fileName)
          notes.push(note.toJSON())
        } catch (error) {
          logger.warn('Skipping invalid note file:', { fileName, error: error.message })
        }
      }

      logger.debug('Retrieved all notes from repository:', { count: notes.length })
      return notes
    } catch (error) {
      logger.error('Failed to get all notes from repository:', error)
      throw createFileOperationError(`Failed to read notes: ${error.message}`)
    }
  }

  /**
   * Update a note
   * @param {string} id - The note ID
   * @param {Object} noteData - The updated note data
   * @returns {Promise<Object>} The updated note
   * @throws {NoteNotFoundError} When note is not found
   * @throws {FileOperationError} When file operations fail
   */
  async function update (id, noteData) {
    try {
      // First check if note exists
      await findById(id)

      // Create updated note with same ID
      const updatedNote = createNote({ ...noteData, id })
      const fileName = `${id}.md`

      await fileManager.writeFile(fileName, updatedNote.toFileContent())

      logger.debug('Note updated in repository:', { id: updatedNote.id, fileName })
      return updatedNote.toJSON()
    } catch (error) {
      logger.error('Failed to update note in repository:', error)
      throw createFileOperationError(`Failed to update note: ${error.message}`)
    }
  }

  /**
   * Delete a note
   * @param {string} id - The note ID
   * @returns {Promise<void>}
   * @throws {NoteNotFoundError} When note is not found
   * @throws {FileOperationError} When file operations fail
   */
  async function deleteNote (id) {
    try {
      const fileName = `${id}.md`

      if (!(await fileManager.fileExists(fileName))) {
        throw createNoteNotFoundError(`Note with ID ${id} not found`)
      }

      await fileManager.deleteFile(fileName)

      logger.debug('Note deleted from repository:', { id, fileName })
    } catch (error) {
      logger.error('Failed to delete note from repository:', error)
      throw createFileOperationError(`Failed to delete note: ${error.message}`)
    }
  }

  return {
    create,
    findById,
    getAll,
    update,
    delete: deleteNote
  }
}

export { createFileNoteRepository }
