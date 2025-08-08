// Constants for MCP Transport configuration

const ALLOWED_HOSTS = [
  '127.0.0.1',                           // Local development
  'localhost',                           // Local development
  'localhost:3000',                      // Local development with port
  '0.0.0.0',                            // Docker container binding
  '0.0.0.0:3000',                       // Docker container with port
  'node-mcp-server-demo-development',    // Docker container name
  'node-mcp-server-demo-development:3000' // Docker container name with port
  // Add your production domains here, e.g.:
  // 'your-domain.com',
  // 'api.your-domain.com'
]

const ALLOWED_ORIGINS = [
  'http://localhost:3000',               // Local development
  'http://127.0.0.1:3000',              // Local development
  'http://0.0.0.0:3000',                // Docker container
  'http://localhost:6274',              // MCP inspector
  'http://localhost:6277',              // MCP inspector
  'http://node-mcp-server-demo-development:3000', // Docker inter-container
  // Allow undefined/null origins for development tools like MCP inspector
  ...(process.env.NODE_ENV === 'production' ? [] : [null, undefined, ''])
  // Add your production origins here, e.g.:
  // 'https://your-domain.com',
  // 'https://www.your-domain.com'
]

export { ALLOWED_HOSTS, ALLOWED_ORIGINS }
