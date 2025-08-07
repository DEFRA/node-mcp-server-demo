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

// ...existing code...

// Factory functions (preferred approach going forward)
function createNoteNotFoundError (noteId) {
  return createDomainError(
    `Note with ID '${noteId}' not found`,
    404,
    'NoteNotFoundError'
  )
}

function createInvalidNoteDataError (message) {
  return createDomainError(
    `Invalid note data: ${message}`,
    400,
    'InvalidNoteDataError'
  )
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
  return createDomainError(
    `MCP protocol error: ${message}`,
    400,
    'McpProtocolError'
  )
}

export {
  createDomainError,
  createNoteNotFoundError,
  createInvalidNoteDataError,
  createFileOperationError,
  createMcpProtocolError
}
