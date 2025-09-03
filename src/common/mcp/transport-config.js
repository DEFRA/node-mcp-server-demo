import { config } from '../../config/index.js'

/**
 * Parse comma-separated string into array, filtering out empty values
 * @param {string} value - Comma-separated string
 * @returns {string[]} Array of trimmed, non-empty values
 */
function parseCommaSeparatedList (value) {
  if (!value || typeof value !== 'string') {
    return []
  }

  return value
    .split(',')
    .map(function (item) { return item.trim() })
    .filter(function (item) { return item.length > 0 })
}

/**
 * Get allowed hosts for MCP transport from configuration
 * @returns {string[]} Array of allowed host patterns
 * @throws {Error} If MCP_ALLOWED_HOSTS environment variable is not configured
 */
function getAllowedHosts () {
  const configHosts = config.get('mcp.transport.allowedHosts')
  const hosts = parseCommaSeparatedList(configHosts)

  if (hosts.length === 0) {
    throw new Error('MCP_ALLOWED_HOSTS environment variable must be configured for security. See .env.example for reference values.')
  }

  return hosts
}

/**
 * Get allowed origins for MCP transport from configuration
 * Includes special handling for development mode to allow null/undefined origins
 * @returns {(string|null|undefined)[]} Array of allowed origins including dev-specific values
 * @throws {Error} If MCP_ALLOWED_ORIGINS environment variable is not configured
 */
function getAllowedOrigins () {
  const configOrigins = config.get('mcp.transport.allowedOrigins')
  const origins = parseCommaSeparatedList(configOrigins)

  if (origins.length === 0) {
    throw new Error('MCP_ALLOWED_ORIGINS environment variable must be configured for security. See .env.example for reference values.')
  }

  // In development mode, also allow null/undefined origins for tools like MCP inspector
  if (process.env.NODE_ENV !== 'production') {
    return [...origins, null, undefined, '']
  }

  return origins
}

export {
  getAllowedHosts,
  getAllowedOrigins
}
