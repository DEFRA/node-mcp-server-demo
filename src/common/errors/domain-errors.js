/**
 * Create a domain-specific error
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @param {string} name - Error name
 * @returns {Error} Domain error instance
 */
function createDomainError (message, statusCode = 400, name = 'DomainError') {
  const error = new Error(message)
  error.name = name
  error.statusCode = statusCode
  Error.captureStackTrace(error, createDomainError)
  return error
}

// Error constructor functions for compatibility with existing class-based usage
function NoteNotFoundError (noteId) {
  return createDomainError(
    `Note with ID '${noteId}' not found`,
    404,
    'NoteNotFoundError'
  )
}

function InvalidNoteDataError (message) {
  return createDomainError(
    `Invalid note data: ${message}`,
    400,
    'InvalidNoteDataError'
  )
}

function McpProtocolError (message) {
  return createDomainError(
    `MCP protocol error: ${message}`,
    400,
    'McpProtocolError'
  )
}

// Factory functions (preferred approach going forward)
function createNoteNotFoundError (noteId) {
  return NoteNotFoundError(noteId)
}

function createInvalidNoteDataError (message) {
  return InvalidNoteDataError(message)
}

function createFileOperationError (operation, filename, originalError) {
  const error = createDomainError(
    `Failed to ${operation} file '${filename}': ${originalError.message}`,
    500,
    'FileOperationError'
  )
  error.originalError = originalError
  return error
}

function createMcpProtocolError (message) {
  return McpProtocolError(message)
}

export {
  createDomainError,
  createNoteNotFoundError,
  createInvalidNoteDataError,
  createFileOperationError,
  createMcpProtocolError
}
