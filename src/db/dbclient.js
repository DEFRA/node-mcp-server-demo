/**
 * Establishes a connection to the MongoDB database and exports the database client.
 *
 * This module uses the MongoDB Node.js driver to connect to the database. It retrieves
 * configuration values from the application's configuration, applies a secure context
 * if available, and logs the connection status.
 */

/**
 * MongoDB client instance for interacting with the database.
 *
 * @module dbClient
 * @requires mongodb.MongoClient
 * @requires config - Application configuration module
 * @requires getSecureContext - Function to retrieve secure context
 * @requires createLogger - Function to create a logger instance
 */

import { MongoClient } from 'mongodb'
import { config } from '../../config/index.js'
import { getSecureContext } from '../common/secure-context/secure-context'
import { createLogger } from '../common/logging/logger'

const logger = createLogger()

/**
 * Retrieves the secure context for the MongoDB connection, if available.
 * @type {Object|null}
 */
const secureContext = getSecureContext()

/**
 * Connects to the MongoDB server and initializes the database client.
 *
 * @type {import('mongodb').Db}
 * @throws {Error} If the connection to MongoDB fails.
 */
const client = await MongoClient.connect(config.get('mongo.uri'), {
  connectTimeoutMS: 10000,
  retryWrites: false,
  readPreference: 'secondary',
  ...(secureContext && { secureContext })
})

/**
 * MongoDB database client for the configured database.
 * @type {import('mongodb').Db}
 */
const dbClient = client.db(config.get('mongo.databaseName'))

logger.info('MongoDB client connected successfully')

export { dbClient }