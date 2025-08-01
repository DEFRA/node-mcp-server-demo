import { NoteModel } from '../models/note.js'
import { NoteParser } from '../utils/note-parser.js'
import { FileManager } from '../../common/filesystem/file-manager.js'
import { NoteNotFoundError, FileOperationError } from '../../common/errors/domain-errors.js'
import { createLogger } from '../../common/logging/logger.js'

/**
 * File-based Note Repository
 * Implements the repository pattern for note persistence using the file system
 */
class FileNoteRepository {
  constructor(notesDirectory) {
    this.notesDirectory = notesDirectory
    this.fileManager = new FileManager(notesDirectory)
    this.noteParser = new NoteParser()
    this.logger = createLogger()
  }

  /**
   * Create a new note
   * @param {Object} noteData - The note data
   * @returns {Promise<Object>} The created note
   * @throws {FileOperationError} When file operations fail
   */
  async create(noteData) {
    try {
      const note = new NoteModel(noteData)
      const fileName = `${note.id}.md`
      
      await this.fileManager.writeFile(fileName, note.toFileContent())
      
      this.logger.debug('Note created in repository:', { id: note.id, fileName })
      return note.toJSON()
      
    } catch (error) {
      this.logger.error('Failed to create note in repository:', error)
      throw new FileOperationError(`Failed to create note: ${error.message}`)
    }
  }

  /**
   * Find a note by ID
   * @param {string} id - The note ID
   * @returns {Promise<Object>} The note
   * @throws {NoteNotFoundError} When note is not found
   * @throws {FileOperationError} When file operations fail
   */
  async findById(id) {
    try {
      const fileName = `${id}.md`
      
      if (!(await this.fileManager.fileExists(fileName))) {
        throw new NoteNotFoundError(`Note with ID ${id} not found`)
      }

      const fileContent = await this.fileManager.readFile(fileName)
      const note = this.noteParser.parseFileContent(fileContent, fileName)
      
      this.logger.debug('Note found in repository:', { id: note.id, fileName })
      return note.toJSON()
      
    } catch (error) {
      if (error instanceof NoteNotFoundError) {
        throw error
      }
      this.logger.error('Failed to find note in repository:', error)
      throw new FileOperationError(`Failed to read note: ${error.message}`)
    }
  }

  /**
   * Get all notes
   * @returns {Promise<Array>} Array of all notes
   * @throws {FileOperationError} When file operations fail
   */
  async getAll() {
    try {
      const files = await this.fileManager.listFiles('.', '.md')
      const notes = []

      for (const fileName of files) {
        try {
          const fileContent = await this.fileManager.readFile(fileName)
          const note = this.noteParser.parseFileContent(fileContent, fileName)
          notes.push(note.toJSON())
        } catch (error) {
          this.logger.warn('Skipping invalid note file:', { fileName, error: error.message })
        }
      }

      this.logger.debug('Retrieved all notes from repository:', { count: notes.length })
      return notes
      
    } catch (error) {
      this.logger.error('Failed to get all notes from repository:', error)
      throw new FileOperationError(`Failed to read notes: ${error.message}`)
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
  async update(id, noteData) {
    try {
      // First check if note exists
      await this.findById(id)
      
      // Create updated note with same ID
      const updatedNote = new NoteModel({ ...noteData, id })
      const fileName = `${id}.md`
      
      await this.fileManager.writeFile(fileName, updatedNote.toFileContent())
      
      this.logger.debug('Note updated in repository:', { id: updatedNote.id, fileName })
      return updatedNote.toJSON()
      
    } catch (error) {
      if (error instanceof NoteNotFoundError) {
        throw error
      }
      this.logger.error('Failed to update note in repository:', error)
      throw new FileOperationError(`Failed to update note: ${error.message}`)
    }
  }

  /**
   * Delete a note
   * @param {string} id - The note ID
   * @returns {Promise<void>}
   * @throws {NoteNotFoundError} When note is not found
   * @throws {FileOperationError} When file operations fail
   */
  async delete(id) {
    try {
      const fileName = `${id}.md`
      
      if (!(await this.fileManager.fileExists(fileName))) {
        throw new NoteNotFoundError(`Note with ID ${id} not found`)
      }

      await this.fileManager.deleteFile(fileName)
      
      this.logger.debug('Note deleted from repository:', { id, fileName })
      
    } catch (error) {
      if (error instanceof NoteNotFoundError) {
        throw error
      }
      this.logger.error('Failed to delete note from repository:', error)
      throw new FileOperationError(`Failed to delete note: ${error.message}`)
    }
  }
}

export { FileNoteRepository }
