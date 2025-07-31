# GitHub Copilot Instructions for AI Legacy Backend

This document provides GitHub Copilot with comprehensive guidelines for contributing to the AI Legacy Backend project, ensuring consistency with established patterns and best practices.

## Project Overview

The AI Legacy Backend is a **Node.js REST API** built with **Hapi.js** framework, implementing a **Repository Pattern** with support for **MongoDB**. The project follows **Domain-Driven Design** principles with clear separation of concerns.

### Key Technologies
- **Runtime**: Node.js >= 22, ES Modules
- **Framework**: Hapi.js v21+
- **Databases**: MongoDB (primary)
- **Validation**: Joi schemas
- **Testing**: Vitest with coverage reporting
- **Linting**: ESLint with neostandard config
- **Containerization**: Docker with Docker Compose

## Architecture Patterns

### 1. Repository Pattern Implementation

Follow the established repository pattern for all data access:

```javascript
// Repository Structure
class MongoEntityRepository {
  constructor(db) {
    this.collection = db.collection('collectionName')
  }

  async create(entity) {
    try {
      const entityModel = new EntityModel(entity)
      const result = await this.collection.insertOne(entityModel)
      return EntityModel.fromDocument({
        ...entityModel,
        _id: result.insertedId
      })
    } catch (error) {
      // Handle domain-specific errors
      if (error.code === 11000) {
        throw new DomainSpecificError(entity.uniqueField)
      }
      throw error
    }
  }

  async findById(id) {
    const document = await this.collection.findOne({ _id: id })
    return document ? EntityModel.fromDocument(document) : null
  }

  async getAll() {
    const documents = await this.collection.find({}).toArray()
    return documents
  }
}
```

### 2. Service Layer Pattern

Implement business logic in service classes:

```javascript
class EntityService {
  constructor(entityRepository) {
    this.entityRepository = entityRepository
  }

  async createEntity(details) {
    const entity = await this.entityRepository.create({ details })
    return {
      details: entity.details
    }
  }

  async getEntityById(id) {
    const entity = await this.entityRepository.findById(id)
    if (!entity) {
      return null
    }
    return {
      details: entity.details
    }
  }
}
```

### 3. API Endpoint Structure

Follow the established endpoint pattern:

```javascript
import Boom from '@hapi/boom'
import { mongoClient } from '../../../../common/database/mongo.js'
import { MongoEntityRepository } from '../../../../data/mongo/repositories/entity.js'
import { EntityService } from '../services/entity.js'
import { createEntitySchema, getEntitySchema } from '../schemas/entity.js'

/**
 * Handler for POST /api/v1/entity
 * Create a new entity
 *
 * @param {import('@hapi/hapi').Request} request - Hapi request object
 * @param {import('@hapi/hapi').ResponseToolkit} h - Hapi response toolkit
 * @returns {import('@hapi/hapi').ResponseObject} Response object
 */
async function createEntity(request, h) {
  try {
    const repo = new MongoEntityRepository(mongoClient)
    const service = new EntityService(repo)

    const entity = await service.createEntity(request.payload.details)

    return h.response({
      message: 'Entity created successfully',
      data: { entity }
    }).code(201)
  } catch (error) {
    // Handle domain-specific errors
    if (error instanceof DomainSpecificError) {
      return h.response({
        error: 'Conflict',
        message: error.message,
        statusCode: error.statusCode
      }).code(error.statusCode)
    }

    request.logger.error('Error creating entity:', error)
    throw Boom.internal(`Failed to create entity: ${error.message}`)
  }
}

const entityRoutes = [
  {
    method: 'POST',
    path: '/api/v1/entity',
    handler: createEntity,
    options: {
      description: 'Create a new entity',
      notes: 'Creates a new entity with validation',
      tags: ['api', 'entity'],
      validate: {
        payload: createEntitySchema
      }
    }
  }
]

export { entityRoutes }
```

## Folder Structure Guidelines

Follow this **strict folder structure**:

```
src/
├── api/
│   ├── plugins/          # Hapi plugins
│   ├── probes/           # Health check endpoints
│   ├── server.js         # Server configuration
│   └── v1/               # API version 1
│       ├── common/       # Shared schemas and utilities
│       │   └── schemas/  # Common validation schemas
│       ├── entity/       # Domain-specific modules
│       │   ├── endpoints/    # Route handlers
│       │   ├── schemas/      # Joi validation schemas
│       │   └── services/     # Business logic
│       └── reference/    # Reference data endpoints
│           ├── endpoints/
│           ├── models/
│           └── services/
├── common/
│   ├── database/         # Database connections
│   ├── errors/           # Custom error classes
│   ├── logging/          # Logger configuration
│   ├── proxy/            # Proxy utilities
│   └── secure-context/   # Security configurations
├── config/               # Application configuration
├── constants/            # Application constants
└── data/
    └── mongo/
        ├── models/       # Data models
        └── repositories/ # Data access layer
```

## Coding Standards

### 1. ES Modules
Always use ES module syntax:
```javascript
import { Something } from './module.js'
export { Something }
```

### 2. Error Handling
- Use **Boom** for HTTP errors in endpoints
- Log errors with **request.logger**
- Create domain-specific error classes
- Handle database errors appropriately

```javascript
} catch (error) {
  request.logger.error('Error description:', error)
  throw Boom.internal(`Failed operation: ${error.message}`)
}
```

### 3. Validation Schemas
Use **Joi** for all input validation:
```javascript
import Joi from 'joi'
import { cph } from '../../common/schemas/schemas.js'

const createEntitySchema = Joi.object({
  details: Joi.object({
    cph: cph.required(),
    name: Joi.string().min(1).max(255).required(),
    // ... other fields
  }).required()
}).required()
```

### 4. JSDoc Documentation
Document all functions with proper JSDoc:
```javascript
/**
 * Handler for GET /api/v1/entity/{id}
 * Retrieve an entity by ID
 *
 * @param {import('@hapi/hapi').Request} request - Hapi request object
 * @param {import('@hapi/hapi').ResponseToolkit} h - Hapi response toolkit
 * @returns {import('@hapi/hapi').ResponseObject} Response object
 */
```

### 5. Database Models
Create models with proper constructors and static methods:
```javascript
class EntityModel {
  constructor(data = {}) {
    this._id = data._id || data.id || null
    this.details = data.details ? new DetailsModel(data.details) : null
    this.updatedAt = new Date()
    
    if (!this._id) {
      this.createdAt = data.createdAt || new Date()
    }
  }

  static fromDocument(doc) {
    return new EntityModel(doc)
  }
}
```

## Testing Guidelines

### 1. Test Structure
- Use **Vitest** for all tests
- Follow naming convention: `*.test.js`
- Place tests in `test/` directory
- Mirror source structure in test folders

### 2. Test Categories
- **Unit tests**: `test/unit/`
- **Integration tests**: `test/integration/narrow/`

### 3. Mocking
```javascript
import { beforeEach, describe, expect, test, vi } from 'vitest'

vi.mock('../../../src/common/logging/logger.js', () => ({
  createLogger: vi.fn().mockReturnValue({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  })
}))
```

## API Design Principles

### 1. RESTful Endpoints
- Use appropriate HTTP methods
- Follow REST conventions
- Return consistent response formats

### 2. Response Format
```javascript
// Success responses
{
  "message": "Operation completed successfully",
  "data": { /* payload */ }
}

// Error responses
{
  "error": "Error Type",
  "message": "Detailed error message",
  "statusCode": 400
}
```

### 3. Route Configuration
```javascript
{
  method: 'GET',
  path: '/api/v1/entity/{id}',
  handler: getEntity,
  options: {
    description: 'Get entity by ID',
    notes: 'Retrieves entity details using its unique identifier',
    tags: ['api', 'entity'],
    validate: {
      params: getEntitySchema
    }
  }
}
```

## Database Guidelines

### 1. MongoDB Patterns
- Use embedded documents for related data
- Implement proper indexing
- Handle duplicate key errors gracefully
- Use ObjectId for primary keys

### 2. Connection Management
```javascript
import { mongoClient } from '../../../../common/database/mongo.js'

// In repository constructor
constructor(db) {
  this.collection = db.collection('collectionName')
}
```

### 3. Error Handling
```javascript
} catch (error) {
  // Handle MongoDB duplicate key error
  if (error.code === 11000 && error.keyPattern && error.keyPattern['field']) {
    throw new DuplicateFieldError(entity.field)
  }
  throw error
}
```

## Environment Configuration

### 1. Environment Variables
Use **convict** for configuration management:
```javascript
// In config files
fieldName: {
  doc: 'Description of the field',
  format: String,
  default: 'default-value',
  env: 'ENVIRONMENT_VARIABLE_NAME'
}
```

### 2. Docker Configuration
- Default port: **3002**
- Debug port: **9232**
- MongoDB: **mongodb://mongodb:27017/**

## Performance Guidelines

### 1. Database Queries
- Use indexes for frequently queried fields
- Implement pagination for large datasets
- Use projection to limit returned fields

### 2. Error Logging
- Log errors at appropriate levels
- Include contextual information
- Use structured logging

## Security Considerations

### 1. Input Validation
- Validate all inputs with Joi schemas
- Sanitize user input
- Use parameter validation for routes

### 2. Error Information
- Don't expose internal details in error messages
- Use generic error messages for production
- Log detailed errors server-side

## Code Quality

### 1. Linting
- Use ESLint with neostandard configuration
- Run `npm run test:lint` before commits
- Fix linting issues with `npm run lint:fix`

### 2. Formatting
- Use Prettier for code formatting
- Run `npm run format` to format code
- Check formatting with `npm run format:check`

## Common Patterns to Follow

### 1. Reference Data Endpoints
```javascript
async function getReferenceData(request, h) {
  try {
    const repository = new MongoReferenceRepository(mongoClient)
    const service = new ReferenceService(repository)
    const data = await service.getOptions(request.query.filter)
    
    return h.response({ data }).code(200)
  } catch (error) {
    request.logger.error('Error fetching reference data:', error)
    throw Boom.internal(`Failed to fetch reference data: ${error.message}`)
  }
}
```

### 2. Domain Error Classes
```javascript
class DomainSpecificError extends Error {
  constructor(field) {
    super(`Duplicate ${field} already exists`)
    this.name = 'DomainSpecificError'
    this.statusCode = 409
  }
}
```

### 3. Service Response Pattern
```javascript
// Service methods should return formatted objects
return {
  details: entity.details
}

// Not raw database documents
```

## Migration Guidelines

When adding new features:
1. Create repository in `src/data/mongo/repositories/`
2. Create service in `src/api/v1/domain/services/`
3. Create schemas in `src/api/v1/domain/schemas/`
4. Create endpoints in `src/api/v1/domain/endpoints/`
5. Add routes to main router
6. Create comprehensive tests
7. Update API documentation

Remember: **Consistency is key**. Follow these patterns exactly to maintain code quality and team productivity.