import fs from 'fs/promises'
import path from 'path'
import { createLogger } from '../logging/logger.js'

/**
 * Simple file system manager for note operations
 * Handles basic file read/write operations for the MCP notes server
 */
class FileManager {
  constructor(baseDir) {
    if (!baseDir) {
      throw new Error('Base directory is required')
    }
    this.baseDir = baseDir
    this.logger = createLogger()
  }

  /**
   * Ensure the base directory exists
   */
  async ensureDirectory() {
    try {
      await fs.mkdir(this.baseDir, { recursive: true })
      this.logger.debug(`Directory ensured: ${this.baseDir}`)
    } catch (error) {
      this.logger.error(`Error creating directory ${this.baseDir}:`, error)
      throw error
    }
  }

  /**
   * Write content to a file
   * @param {string} filename - Name of the file to write
   * @param {string} content - Content to write to the file
   * @returns {Promise<string>} Full path of the written file
   */
  async writeFile(filename, content) {
    try {
      if (!filename || typeof filename !== 'string') {
        throw new Error('Filename is required and must be a string')
      }
      if (typeof content !== 'string') {
        throw new Error('Content must be a string')
      }

      await this.ensureDirectory()
      const filePath = path.join(this.baseDir, filename)
      await fs.writeFile(filePath, content, 'utf8')
      
      this.logger.info(`File written: ${filename}`)
      return filePath
    } catch (error) {
      this.logger.error(`Error writing file ${filename}:`, error)
      throw error
    }
  }

  /**
   * Read content from a file
   * @param {string} filename - Name of the file to read
   * @returns {Promise<string|null>} File content or null if file doesn't exist
   */
  async readFile(filename) {
    try {
      if (!filename || typeof filename !== 'string') {
        throw new Error('Filename is required and must be a string')
      }

      const filePath = path.join(this.baseDir, filename)
      const content = await fs.readFile(filePath, 'utf8')
      
      this.logger.debug(`File read: ${filename}`)
      return content
    } catch (error) {
      if (error.code === 'ENOENT') {
        this.logger.debug(`File not found: ${filename}`)
        return null
      }
      this.logger.error(`Error reading file ${filename}:`, error)
      throw error
    }
  }

  /**
   * List files in the directory with optional extension filter
   * @param {string} [relativePath='.'] - Relative path within the base directory
   * @param {string} [extension] - File extension to filter by (e.g., '.md', '.txt')
   * @returns {Promise<string[]>} Array of filenames
   */
  async listFiles(relativePath = '.', extension = '.txt') {
    try {
      await this.ensureDirectory()
      const targetDir = relativePath === '.' ? this.baseDir : path.join(this.baseDir, relativePath)
      const files = await fs.readdir(targetDir)
      const filteredFiles = files.filter(file => file.endsWith(extension))
      
      this.logger.debug(`Listed ${filteredFiles.length} ${extension} files from ${relativePath}`)
      return filteredFiles
    } catch (error) {
      this.logger.error('Error listing files:', error)
      throw error
    }
  }

  /**
   * Check if a file exists
   * @param {string} filename - Name of the file to check
   * @returns {Promise<boolean>} True if file exists, false otherwise
   */
  async fileExists(filename) {
    try {
      if (!filename || typeof filename !== 'string') {
        throw new Error('Filename is required and must be a string')
      }

      const filePath = path.join(this.baseDir, filename)
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
  async getFileStats(filename) {
    try {
      if (!filename || typeof filename !== 'string') {
        throw new Error('Filename is required and must be a string')
      }

      const filePath = path.join(this.baseDir, filename)
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
      this.logger.error(`Error getting file stats for ${filename}:`, error)
      throw error
    }
  }
}

export { FileManager }
