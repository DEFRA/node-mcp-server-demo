import { MongoClient } from 'mongodb'
import { config } from '../../../config/index.js'
import { getSecureContext } from '../../secure-context/secure-context.js'
import { createLogger } from '../../logging/logger.js'

const logger = createLogger()

let mongoClient = null
let db = null

/**
 * Retrieves the secure context for the MongoDB connection, if available.
 * @returns {Object|null} Secure context or null
 */
function getMongoSecureContext () {
  try {
    return getSecureContext()
  } catch (error) {
    logger.warn('Secure context not available:', error.message)
    return null
  }
}

/**
 * Connect to MongoDB and return database instance
 * @returns {Promise<Object>} MongoDB database instance
 */
async function connectToDatabase () {
  try {
    if (!mongoClient) {
      const secureContext = getMongoSecureContext()
      const mongoUri = config.get('mongo.uri')

      mongoClient = new MongoClient(mongoUri, {
        connectTimeoutMS: 10000,
        retryWrites: false,
        readPreference: 'secondary',
        ...(secureContext && { secureContext })
      })

      await mongoClient.connect()
      db = mongoClient.db(config.get('mongo.databaseName'))

      logger.info('MongoDB client connected successfully')
    }

    return db
  } catch (error) {
    logger.error('Error connecting to MongoDB:', error)
    throw error
  }
}

/**
 * Close MongoDB connection
 * @returns {Promise<void>}
 */
async function closeDatabase () {
  try {
    if (mongoClient) {
      logger.info('Closing MongoDB connection...')
      await mongoClient.close()
      mongoClient = null
      db = null
      logger.info('MongoDB connection closed successfully')
    } else {
      logger.info('MongoDB connection already closed or never opened')
    }
  } catch (error) {
    logger.error('Error closing MongoDB connection:', error)
    // Reset the variables even if close failed
    mongoClient = null
    db = null
    throw error
  }
}

export { connectToDatabase, closeDatabase }
