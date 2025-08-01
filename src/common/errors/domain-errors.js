/**
 * Base class for domain-specific errors
 */
class DomainError extends Error {
  constructor(message, statusCode = 400) {
    super(message)
    this.name = this.constructor.name
    this.statusCode = statusCode
    Error.captureStackTrace(this, this.constructor)
  }
}

/**
 * Error thrown when a note is not found
 */
class NoteNotFoundError extends DomainError {
  constructor(noteId) {
    super(`Note with ID '${noteId}' not found`, 404)
  }
}

/**
 * Error thrown when a note creation fails due to invalid data
 */
class InvalidNoteDataError extends DomainError {
  constructor(message) {
    super(`Invalid note data: ${message}`, 400)
  }
}

/**
 * Error thrown when file operations fail
 */
class FileOperationError extends DomainError {
  constructor(operation, filename, originalError) {
    super(`Failed to ${operation} file '${filename}': ${originalError.message}`, 500)
    this.originalError = originalError
  }
}

/**
 * Error thrown when MCP protocol validation fails
 */
class McpProtocolError extends DomainError {
  constructor(message) {
    super(`MCP protocol error: ${message}`, 400)
  }
}

export {
  DomainError,
  NoteNotFoundError,
  InvalidNoteDataError,
  FileOperationError,
  McpProtocolError
}
