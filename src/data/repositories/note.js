import { NoteModel } from '../models/note.js'
import { FileManager } from '../../common/filesystem/file-manager.js'
import { createLogger } from '../../common/logging/logger.js'

/**
 * Domain-specific error for note not found
 */
class NoteNotFoundError extends Error {
  constructor(id) {
    super(`Note with ID ${id} not found`)
    this.name = 'NoteNotFoundError'
    this.statusCode = 404
    this.noteId = id
  }
}

/**
 * File-based repository for note management
 * Handles basic create and read operations for notes stored as text files
 */
class FileNoteRepository {
  constructor(notesDir) {
    if (!notesDir) {
      throw new Error('Notes directory is required')
    }
    this.fileManager = new FileManager(notesDir)
    this.logger = createLogger()
  }

  /**
   * Create a new note
   * @param {Object} noteData - Note data to create
   * @param {string} noteData.title - Note title
   * @param {string} noteData.content - Note content
   * @returns {Promise<NoteModel>} Created note model
   */
  async create(noteData) {
    try {
      if (!noteData || typeof noteData !== 'object') {
        throw new Error('Note data is required and must be an object')
      }

      // Create and validate note
      const note = new NoteModel(noteData)
      note.validate()

      // Generate filename and write to file
      const filename = note.generateFilename()
      const fileContent = note.toFileContent()
      
      await this.fileManager.writeFile(filename, fileContent)
      
      this.logger.info(`Note created successfully: ${note.id}`)
      return note
    } catch (error) {
      this.logger.error('Error creating note:', error)
      throw error
    }
  }

  /**
   * Find a note by ID
   * @param {string} id - Note ID
   * @returns {Promise<NoteModel|null>} Found note or null if not found
   */
  async findById(id) {
    try {
      if (!id || typeof id !== 'string') {
        throw new Error('Note ID is required and must be a string')
      }

      // Get all files and search for the note
      const files = await this.fileManager.listFiles()
      
      for (const filename of files) {
        // Check if filename contains the ID (format: noteId_title.txt)
        if (filename.startsWith(id + '_')) {
          const content = await this.fileManager.readFile(filename)
          if (content) {
            const note = NoteModel.fromFileContent(content, filename)
            if (note.id === id) {
              this.logger.debug(`Note found: ${id}`)
              return note
            }
          }
        }
      }
      
      this.logger.debug(`Note not found: ${id}`)
      return null
    } catch (error) {
      this.logger.error(`Error finding note by ID ${id}:`, error)
      throw error
    }
  }

  /**
   * Find all notes
   * @returns {Promise<NoteModel[]>} Array of all notes
   */
  async findAll() {
    try {
      const files = await this.fileManager.listFiles()
      const notes = []

      for (const filename of files) {
        try {
          const content = await this.fileManager.readFile(filename)
          if (content) {
            const note = NoteModel.fromFileContent(content, filename)
            notes.push(note)
          }
        } catch (error) {
          // Log warning for corrupted files but continue processing
          this.logger.warn(`Skipping corrupted note file ${filename}:`, error.message)
        }
      }

      // Sort notes by creation date (newest first)
      notes.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

      this.logger.debug(`Found ${notes.length} notes`)
      return notes
    } catch (error) {
      this.logger.error('Error finding all notes:', error)
      throw error
    }
  }

  /**
   * Check if a note exists by ID
   * @param {string} id - Note ID
   * @returns {Promise<boolean>} True if note exists, false otherwise
   */
  async exists(id) {
    try {
      const note = await this.findById(id)
      return note !== null
    } catch (error) {
      this.logger.error(`Error checking if note exists ${id}:`, error)
      throw error
    }
  }

  /**
   * Get count of total notes
   * @returns {Promise<number>} Total number of notes
   */
  async count() {
    try {
      const files = await this.fileManager.listFiles()
      return files.length
    } catch (error) {
      this.logger.error('Error counting notes:', error)
      throw error
    }
  }

  /**
   * Get repository statistics
   * @returns {Promise<object>} Repository stats
   */
  async getStats() {
    try {
      const files = await this.fileManager.listFiles()
      const notes = await this.findAll()
      
      return {
        totalNotes: notes.length,
        totalFiles: files.length,
        oldestNote: notes.length > 0 ? notes[notes.length - 1].createdAt : null,
        newestNote: notes.length > 0 ? notes[0].createdAt : null
      }
    } catch (error) {
      this.logger.error('Error getting repository stats:', error)
      throw error
    }
  }
}

export { FileNoteRepository, NoteNotFoundError }
