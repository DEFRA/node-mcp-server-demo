import { createLogger } from '../../../../common/logging/logger.js'
import { NoteNotFoundError } from '../../../../data/repositories/note.js'

/**
 * Service class for note operations following established service patterns
 * Provides business logic layer for note management
 */
class NoteService {
  constructor(noteRepository) {
    if (!noteRepository) {
      throw new Error('Note repository is required')
    }
    this.noteRepository = noteRepository
    this.logger = createLogger()
  }

  /**
   * Create a new note
   * @param {Object} noteData - Note creation data
   * @param {string} noteData.title - Note title
   * @param {string} noteData.content - Note content
   * @returns {Promise<Object>} Created note details
   */
  async createNote({ title, content }) {
    try {
      // Validate input
      if (!title || typeof title !== 'string' || title.trim().length === 0) {
        throw new Error('Note title is required and must be a non-empty string')
      }
      
      if (typeof content !== 'string') {
        throw new Error('Note content must be a string')
      }

      // Create note through repository
      const note = await this.noteRepository.create({ title: title.trim(), content })
      
      this.logger.info(`Note created via service: ${note.id}`)
      
      return {
        details: {
          id: note.id,
          title: note.title,
          content: note.content,
          createdAt: note.createdAt
        }
      }
    } catch (error) {
      this.logger.error('Error creating note via service:', error)
      throw error
    }
  }

  /**
   * Get a note by ID
   * @param {string} id - Note ID
   * @returns {Promise<Object|null>} Note details or null if not found
   */
  async getNoteById(id) {
    try {
      if (!id || typeof id !== 'string') {
        throw new Error('Note ID is required and must be a string')
      }
      
      const note = await this.noteRepository.findById(id)
      if (!note) {
        this.logger.debug(`Note not found via service: ${id}`)
        return null
      }
      
      this.logger.debug(`Note retrieved via service: ${id}`)
      
      return {
        details: {
          id: note.id,
          title: note.title,
          content: note.content,
          createdAt: note.createdAt
        }
      }
    } catch (error) {
      this.logger.error(`Error getting note ${id} via service:`, error)
      throw error
    }
  }

  /**
   * Get all notes
   * @returns {Promise<Array>} Array of note details
   */
  async getAllNotes() {
    try {
      const notes = await this.noteRepository.findAll()
      
      this.logger.debug(`Retrieved ${notes.length} notes via service`)
      
      return notes.map(note => ({
        details: {
          id: note.id,
          title: note.title,
          content: note.content,
          createdAt: note.createdAt
        }
      }))
    } catch (error) {
      this.logger.error('Error getting all notes via service:', error)
      throw error
    }
  }

  /**
   * Check if a note exists
   * @param {string} id - Note ID
   * @returns {Promise<boolean>} True if note exists, false otherwise
   */
  async noteExists(id) {
    try {
      if (!id || typeof id !== 'string') {
        throw new Error('Note ID is required and must be a string')
      }
      
      const exists = await this.noteRepository.exists(id)
      this.logger.debug(`Note existence check for ${id}: ${exists}`)
      
      return exists
    } catch (error) {
      this.logger.error(`Error checking note existence ${id} via service:`, error)
      throw error
    }
  }

  /**
   * Get service statistics
   * @returns {Promise<Object>} Service statistics
   */
  async getServiceStats() {
    try {
      const repoStats = await this.noteRepository.getStats()
      
      const stats = {
        totalNotes: repoStats.totalNotes,
        oldestNote: repoStats.oldestNote,
        newestNote: repoStats.newestNote,
        serviceName: 'NoteService',
        lastAccessed: new Date()
      }
      
      this.logger.debug('Service stats retrieved:', stats)
      return stats
    } catch (error) {
      this.logger.error('Error getting service stats:', error)
      throw error
    }
  }

  /**
   * Get a summary of recent notes (last 5)
   * @returns {Promise<Array>} Array of recent note summaries
   */
  async getRecentNotes() {
    try {
      const allNotes = await this.noteRepository.findAll()
      const recentNotes = allNotes.slice(0, 5) // Get first 5 (already sorted by date)
      
      this.logger.debug(`Retrieved ${recentNotes.length} recent notes via service`)
      
      return recentNotes.map(note => ({
        id: note.id,
        title: note.title,
        createdAt: note.createdAt,
        preview: note.content.substring(0, 100) + (note.content.length > 100 ? '...' : '')
      }))
    } catch (error) {
      this.logger.error('Error getting recent notes via service:', error)
      throw error
    }
  }

  /**
   * Search notes by title (simple text matching)
   * @param {string} searchTerm - Term to search for in titles
   * @returns {Promise<Array>} Array of matching note details
   */
  async searchNotesByTitle(searchTerm) {
    try {
      if (!searchTerm || typeof searchTerm !== 'string') {
        throw new Error('Search term is required and must be a string')
      }
      
      const allNotes = await this.noteRepository.findAll()
      const searchTermLower = searchTerm.toLowerCase()
      
      const matchingNotes = allNotes.filter(note =>
        note.title.toLowerCase().includes(searchTermLower)
      )
      
      this.logger.debug(`Found ${matchingNotes.length} notes matching "${searchTerm}"`)
      
      return matchingNotes.map(note => ({
        details: {
          id: note.id,
          title: note.title,
          content: note.content,
          createdAt: note.createdAt
        }
      }))
    } catch (error) {
      this.logger.error(`Error searching notes for "${searchTerm}" via service:`, error)
      throw error
    }
  }
}

export { NoteService }
