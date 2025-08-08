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
  return error
}

export { createDomainError }
