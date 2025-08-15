/**
 * Repository for Note operations.
 *
 * This module provides functions to interact with the `mcp_notes` collection in MongoDB.
 * It includes operations for creating, retrieving, and deleting notes.
 *
 * @module createMcpNoteRepository
 * @requires crypto.randomUUID - Generates unique identifiers for notes
 * @requires dbClient - MongoDB database client instance
 */

import { randomUUID } from 'crypto'
import { dbClient } from '../../db/dbclient.js'

/**
 * Creates a new note repository.
 *
 * @returns {Object} An object containing repository methods.
 */
function createMcpNoteRepository () {
  /**
   * Create a new note.
   *
   * @param {Object} noteData - The note data containing `title` and `content`.
   * @returns {Promise<Object>} The created note document.
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
    const mcpNotes = dbClient.collection('mcp_notes')

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
   * Find a note by its noteId.
   *
   * @param {string} noteId - The user-facing noteId (UUID).
   * @returns {Promise<Object|null>} The note document or null if not found.
   */
  async function findByNoteId (noteId) {
    const mcpNotes = dbClient.collection('mcp_notes')
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
   * Get all notes.
   *
   * @returns {Promise<Array>} An array of note documents.
   */
  async function getAllNotes () {
    const mcpNotes = dbClient.collection('mcp_notes')

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
   * Delete a note by its noteId.
   *
   * @param {string} noteId - The user-facing noteId (UUID).
   * @returns {Promise<boolean>} True if the note was deleted, false if not found.
   */
  async function deleteByNoteId (noteId) {
    const mcpNotes = dbClient.collection('mcp_notes')

    const result = await mcpNotes.deleteOne({ noteId })
    return result.deletedCount > 0
  }

  return { createNote, findByNoteId, getAllNotes, deleteByNoteId }
}

export { createMcpNoteRepository }
