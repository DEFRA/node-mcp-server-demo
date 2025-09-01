import { MongoClient } from 'mongodb'
import { config } from '../../../config/index.js'
import { createLogger } from '../../logging/logger.js'

const logger = createLogger()

/**
 * Connect to MongoDB and return database instance
 * @returns {Promise<object>} MongoDB database instance
 */
async function connectToDatabase () {
  try {
    const mongoUri = config.get('mongo.uri')
    const mongoClient = new MongoClient(mongoUri)
    await mongoClient.connect()
    const db = mongoClient.db(config.get('mongo.databaseName'))

    logger.info('MongoDB connected successfully')
    return db
  } catch (error) {
    logger.error('Error connecting to MongoDB:', error)
    throw error
  }
}
export { connectToDatabase }
