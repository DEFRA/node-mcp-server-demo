/**
 * Note model schema for MongoDB
 * @typedef {Object} Note
 * @property {string} _id - MongoDB ObjectId
 * @property {string} title - Note title
 * @property {string} content - Note content
 * @property {Date} createdAt - Creation timestamp
 * @property {Date} updatedAt - Last update timestamp
 */

function createNoteModel (db) {
  const collection = db.collection('mcp_notes')
  return collection
}

export { createNoteModel }
