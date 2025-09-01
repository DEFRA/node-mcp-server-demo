import { createLogger } from '../../../../common/logging/logger.js'
import { createNote, findByNoteId, getAllNotes, deleteByNoteId } from '../../../../data/repositories/mcp-notes.js'
import { getMcpNotesCollection } from '../../../../common/database/mongo/collection.js'

const logger = createLogger()

/**
 * Create a new MCP note with validation
 *
 * @param {Object} noteData - The note data
 * @param {string} noteData.title - The title of the note
 * @param {string} noteData.content - The content of the note
 * @returns {Promise<Object>} The created note, wrapped in a `details` object
 * @throws {Error} Throws an error if the note data is invalid or if the database operation fails
 */
async function createNoteWithValidation (noteData) {
  try {
    const mcpNotesCollection = await getMcpNotesCollection()
    logger.debug('Creating new MCP note:', { title: noteData.title })

    if (!noteData.title || !noteData.content) {
      throw Error('InvalidNoteDataError: Title and content are required')
    }

    const note = await createNote(noteData, mcpNotesCollection)

    logger.info('MCP note created successfully:', {
      noteID: note.noteId,
      title: note.title
    })

    return { details: note }
  } catch (error) {
    logger.error('Error creating MCP note:', error)
    throw error
  }
}

/**
 * Fetch an MCP note by its unique ID
 *
 * @param {string} noteId - The unique ID of the note
 * @returns {Promise<Object>} The retrieved note, wrapped in a `details` object
 * @throws {Error} Throws an error if the note ID is invalid or if the note is not found
 */
async function fetchNoteById (noteId) {
  try {
    const mcpNotesCollection = await getMcpNotesCollection()
    logger.debug('Retrieving MCP note by ID:', { noteId })

    if (!noteId) {
      throw Error('InvalidNoteDataError: Note ID is required')
    }

    const note = await findByNoteId(noteId, mcpNotesCollection)

    if (!note) {
      throw Error(`NoteNotFoundError: MCP note with ID ${noteId} not found`)
    }

    logger.info('MCP note retrieved successfully:', { noteId: note.noteId, title: note.title })
    return { details: note }
  } catch (error) {
    logger.error('Error retrieving MCP note by ID:', error)
    throw error
  }
}

/**
 * Fetch all MCP notes
 *
 * @returns {Promise<Array>} An array of all notes, each wrapped in a `details` object
 * @throws {Error} Throws an error if the database operation fails
 */
async function fetchAllNotes () {
  try {
    const mcpNotesCollection = await getMcpNotesCollection()
    logger.debug('Retrieving all MCP notes')
    const notes = await getAllNotes(mcpNotesCollection)

    logger.info('MCP notes retrieved successfully:', { count: notes.length })

    // Format each note as { details: note }
    const formattedNotes = notes.map(note => ({ details: note }))

    return formattedNotes
  } catch (error) {
    logger.error('Error retrieving all MCP notes:', error)
    throw error
  }
}

/**
 * Remove an MCP note by its unique ID
 *
 * @param {string} noteId - The unique ID of the note to be deleted
 * @returns {Promise<Object>} The deleted note, wrapped in a `details` object
 * @throws {Error} Throws an error if the note is not found or if the database operation fails
 */
async function removeNoteById (noteId) {
  try {
    const mcpNotesCollection = await getMcpNotesCollection()
    logger.debug('Deleting MCP note by ID:', { noteId })

    const note = await findByNoteId(noteId, mcpNotesCollection)

    if (!note) {
      throw Error(`NoteNotFoundError: Note with note ID ${noteId} does not exist`)
    }

    await deleteByNoteId(noteId, mcpNotesCollection)

    logger.info('MCP note deleted successfully:', { noteId: note.noteId, title: note.title })
    return { details: note }
  } catch (error) {
    logger.error('Error deleting MCP note by ID:', error)
    throw error
  }
}

export {
  createNoteWithValidation,
  fetchNoteById,
  fetchAllNotes,
  removeNoteById
}
