import { connectToDatabase } from './mongo.js'

let mcpNotesCollection

/**
 * Get the MCP Notes MongoDB collection
 * @returns {Promise<Object>} MongoDB collection for MCP notes
 */
async function getMcpNotesCollection () {
  if (!mcpNotesCollection) {
    const db = await connectToDatabase()
    mcpNotesCollection = db.collection('mcp_notes')
  }
  return mcpNotesCollection
}

export { getMcpNotesCollection }
