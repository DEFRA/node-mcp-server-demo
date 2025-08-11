import { randomUUID } from 'crypto'
/**
 * Repository for Note operations
 * @param {Db} db - MongoDB database instance
 */
function createMcpNoteRepository (db) {
  const mcpNotes = db.collection('mcp_notes')

  /**
   * Create a new note
   * @param {Object} noteData - { title, content }
   * @returns {Promise<Object>} The created note
   * @description Generates a unique noteId using Node.js's built-in randomUUID function.
   */
  async function createNote (noteData) {
    const now = new Date()
    const doc = {
      noteId: randomUUID(), // Generate a unique ID for the note
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

  /**
   * Find a note by its noteId
   * @param {string} noteId - The user-facing noteId (UUID)
   * @returns {Promise<Object|null>} The note document or null if not found
   */
  async function findByNoteId (noteId) {
    const note = await mcpNotes.findOne({ noteId })
    if (!note) return null
    return {
      _id: note._id,
      noteId: note.noteId,
      title: note.title,
      content: note.content,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt
    }
  }

  /**
   * Get all notes
   * @returns {Promise<Array>} Array of note documents
   */
  async function getAllNotes () {
    const notes = await mcpNotes.find({}).toArray()
    const formattedNotes = []
    for (const note of notes) {
      formattedNotes.push({
        _id: note._id,
        noteId: note.noteId,
        title: note.title,
        content: note.content,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt
      })
    }
    return formattedNotes
  }

  /**
   * Delete a note by its noteId
   * @param {string} noteId - The user-facing noteId (UUID)
   * @returns {Promise<boolean>} True if deleted, false if not found
   */
  async function deleteByNoteId (noteId) {
    const result = await mcpNotes.deleteOne({ noteId })
    return result.deletedCount > 0
  }

  return { createNote, findByNoteId, getAllNotes, deleteByNoteId }
}

export { createMcpNoteRepository }
