import fs from 'fs/promises'
import path from 'path'
import { createLogger } from '../logging/logger.js'

/**
 * Create a file manager factory function
 * @param {string} baseDir - Base directory for file operations
 * @returns {object} File manager object with methods
 */
function createFileManager (baseDir) {
  if (!baseDir) {
    throw new Error('Base directory is required')
  }

  const logger = createLogger()

  /**
   * Ensure the base directory exists
   */
  async function ensureDirectory () {
    try {
      await fs.mkdir(baseDir, { recursive: true })
      logger.debug(`Directory ensured: ${baseDir}`)
    } catch (error) {
      logger.error(`Error creating directory ${baseDir}:`, error)
      throw error
    }
  }

  /**
   * Write content to a file
   * @param {string} filename - Name of the file to write
   * @param {string} content - Content to write to the file
   * @returns {Promise<string>} Full path of the written file
   */
  async function writeFile (filename, content) {
    try {
      if (!filename || typeof filename !== 'string') {
        throw new Error('Filename is required and must be a string')
      }
      if (typeof content !== 'string') {
        throw new Error('Content must be a string')
      }

      await ensureDirectory()
      const filePath = path.join(baseDir, filename)
      await fs.writeFile(filePath, content, 'utf8')

      logger.info(`File written: ${filename}`)
      return filePath
    } catch (error) {
      logger.error(`Error writing file ${filename}:`, error)
      throw error
    }
  }

  /**
   * Read content from a file
   * @param {string} filename - Name of the file to read
   * @returns {Promise<string|null>} File content or null if file doesn't exist
   */
  async function readFile (filename) {
    try {
      if (!filename || typeof filename !== 'string') {
        throw new Error('Filename is required and must be a string')
      }

      const filePath = path.join(baseDir, filename)
      const content = await fs.readFile(filePath, 'utf8')

      logger.debug(`File read: ${filename}`)
      return content
    } catch (error) {
      if (error.code === 'ENOENT') {
        logger.debug(`File not found: ${filename}`)
        return null
      }
      logger.error(`Error reading file ${filename}:`, error)
      throw error
    }
  }

  /**
   * List files in the directory with optional extension filter
   * @param {string} [relativePath='.'] - Relative path within the base directory
   * @param {string} [extension] - File extension to filter by (e.g., '.md', '.txt')
   * @returns {Promise<string[]>} Array of filenames
   */
  async function listFiles (relativePath = '.', extension = '.txt') {
    try {
      await ensureDirectory()
      const targetDir = relativePath === '.' ? baseDir : path.join(baseDir, relativePath)
      const files = await fs.readdir(targetDir)
      const filteredFiles = files.filter(file => file.endsWith(extension))

      logger.debug(`Listed ${filteredFiles.length} ${extension} files from ${relativePath}`)
      return filteredFiles
    } catch (error) {
      logger.error('Error listing files:', error)
      throw error
    }
  }

  /**
   * Check if a file exists
   * @param {string} filename - Name of the file to check
   * @returns {Promise<boolean>} True if file exists, false otherwise
   */
  async function fileExists (filename) {
    try {
      if (!filename || typeof filename !== 'string') {
        throw new Error('Filename is required and must be a string')
      }

      const filePath = path.join(baseDir, filename)
      await fs.access(filePath)
      return true
    } catch {
      return false
    }
  }

  /**
   * Get file stats
   * @param {string} filename - Name of the file
   * @returns {Promise<object|null>} File stats or null if file doesn't exist
   */
  async function getFileStats (filename) {
    try {
      if (!filename || typeof filename !== 'string') {
        throw new Error('Filename is required and must be a string')
      }

      const filePath = path.join(baseDir, filename)
      const stats = await fs.stat(filePath)

      return {
        size: stats.size,
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime,
        isFile: stats.isFile()
      }
    } catch (error) {
      if (error.code === 'ENOENT') {
        return null
      }
      logger.error(`Error getting file stats for ${filename}:`, error)
      throw error
    }
  }

  /**
   * Delete a file
   * @param {string} filename - Name of the file to delete
   * @returns {Promise<void>}
   */
  async function deleteFile (filename) {
    try {
      if (!filename || typeof filename !== 'string') {
        throw new Error('Filename is required and must be a string')
      }

      const filePath = path.join(baseDir, filename)
      await fs.unlink(filePath)

      logger.info(`File deleted: ${filename}`)
    } catch (error) {
      logger.error(`Error deleting file ${filename}:`, error)
      throw error
    }
  }

  return {
    ensureDirectory,
    writeFile,
    readFile,
    listFiles,
    fileExists,
    getFileStats,
    deleteFile
  }
}

export { createFileManager }
