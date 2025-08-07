import { v4 as uuidv4 } from 'uuid'
import { createNoteModel } from '../models/mcp-notes.js'

/**
 * Repository for Note operations
 * @param {Db} db - MongoDB database instance
 */
function createMcpNoteRepository (db) {
  const mcpNotes = createNoteModel(db)

  /**
   * Create a new note
   * @param {Object} noteData - { title, content }
   * @returns {Promise<Object>} The created note
   */
  async function createNote (noteData) {
    const now = new Date()
    const doc = {
      noteId: uuidv4(), // Generate a unique ID for the note
      ...noteData,
      createdAt: now,
      updatedAt: now
    }

    const result = await mcpNotes.insertOne(doc)
    return {
      _id: result.insertedId, // MongoDB internal id
      noteId: doc.noteId,
      title: doc.title,
      content: doc.content,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt
    }
  }

  return { createNote }
}

export { createMcpNoteRepository }
