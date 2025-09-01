<<<<<<< HEAD
import { randomUUID } from 'crypto'

/**
 * Create a new note in the MCP notes collection.
 *
 * @param {Object} noteData - The note data to be created.
 * @param {string} noteData.title - The title of the note.
 * @param {string} noteData.content - The content of the note.
 * @param {Object} mcpNotes - The MongoDB collection for MCP notes.
 * @returns {Promise<Object>} The created note, including its MongoDB `_id` and metadata.
 * @throws {Error} Throws an error if the database operation fails.
 * @description Generates a unique `noteId` using Node.js's built-in `randomUUID` function.
 */
async function createNote (noteData, mcpNotes) {
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
 * Find a note by its unique `noteId`.
 *
 * @param {string} noteId - The unique `noteId` of the note (UUID).
 * @param {Object} mcpNotes - The MongoDB collection for MCP notes.
 * @returns {Promise<Object|null>} The note document if found, or `null` if not found.
 * @throws {Error} Throws an error if the database operation fails.
 */
async function findByNoteId (noteId, mcpNotes) {
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
 * Retrieve all notes from the MCP notes collection.
 *
 * @param {Object} mcpNotes - The MongoDB collection for MCP notes.
 * @returns {Promise<Array>} An array of note documents, each including metadata.
 * @throws {Error} Throws an error if the database operation fails.
 */
async function getAllNotes (mcpNotes) {
  const notes = await mcpNotes.find({}).toArray()
  const formattedNotes = []
  for (const note of notes) {
    formattedNotes.push({
=======
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
>>>>>>> 433fa523ed9e5fc7d9ce83c14fe1a2fb5b05f819
      _id: note._id,
      noteId: note.noteId,
      title: note.title,
      content: note.content,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt
    })
  }
<<<<<<< HEAD
  return formattedNotes
=======

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
>>>>>>> 433fa523ed9e5fc7d9ce83c14fe1a2fb5b05f819
}

/**
 * Delete a note by its unique `noteId`.
 *
 * @param {string} noteId - The unique `noteId` of the note (UUID).
 * @param {Object} mcpNotes - The MongoDB collection for MCP notes.
 * @returns {Promise<boolean>} `true` if the note was deleted, `false` if no note was found.
 * @throws {Error} Throws an error if the database operation fails.
 */
async function deleteByNoteId (noteId, mcpNotes) {
  const result = await mcpNotes.deleteOne({ noteId })
  return result.deletedCount > 0
}

export { createNote, findByNoteId, getAllNotes, deleteByNoteId }
