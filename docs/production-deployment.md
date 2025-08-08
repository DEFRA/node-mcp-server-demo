# Production Deployment Considerations

## Overview

This document outlines the key considerations and required changes when deploying the MCP-enabled Node.js application to a production server environment, as opposed to running it locally in Docker.

## Security Considerations

### 1. DNS Rebinding Protection Updates

**⚠️ CRITICAL SECURITY CONFIGURATION**

The MCP transport layer has environment-specific DNS rebinding protection that **MUST** be properly configured for production deployment.

**Current Configuration (Development Environment)**:
```javascript
// Check if we're in production environment
const isProduction = process.env.NODE_ENV === 'production'

const transport = new StreamableHTTPServerTransport({
  // Only enable DNS rebinding protection in production
  // This allows MCP inspector and other development tools to work properly
  enableDnsRebindingProtection: isProduction,
  allowedHosts: [
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
  ],
  allowedOrigins: [
    'http://localhost:3000',               // Local development
    'http://127.0.0.1:3000',              // Local development
    'http://0.0.0.0:3000',                // Docker container
    'http://localhost:6274',              // mcp inspector
    'http://localhost:6277',              // mcp inspector
    'http://node-mcp-server-demo-development:3000', // Docker inter-container
    // Allow undefined/null origins for development tools like MCP inspector
    ...(isProduction ? [] : [null, undefined, ''])
    // Add your production origins here, e.g.:
    // 'https://your-domain.com',
    // 'https://www.your-domain.com'
  ]
})
```

**Production Configuration Requirements**:

1. **Set NODE_ENV=production** - This enables DNS rebinding protection
2. **Update allowedHosts** for your production domains:
```javascript
allowedHosts: [
  'your-domain.com',
  'api.your-domain.com',
  'mcp.your-domain.com',
  process.env.SERVER_HOSTNAME,
  // Add load balancer IPs if applicable
  '10.0.0.0/8',  // Internal network range
  '172.16.0.0/12' // Docker network range
]
```

3. **Update allowedOrigins** for your production origins:
```javascript
allowedOrigins: [
  'https://your-domain.com',
  'https://www.your-domain.com',
  'https://app.your-domain.com',
  // Remove development origins (localhost, null, undefined)
]
```

**⚠️ Security Warning**: 
- The development configuration allows `null` and `undefined` origins to support MCP inspector
- This **MUST NOT** be present in production as it creates a security vulnerability
- The `isProduction` check ensures this is automatically handled based on NODE_ENV

### 2. Session Storage

**Current Implementation (In-Memory)**:
```javascript
const sessions = new Map()
```

**Production Implementation (Redis)**:
```javascript
import Redis from 'ioredis'

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD,
  db: 0,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3
})

class SessionManager {
  async createSession(sessionId, data) {
    await redis.setex(`session:${sessionId}`, 3600, JSON.stringify(data))
  }

  async getSession(sessionId) {
    const data = await redis.get(`session:${sessionId}`)
    return data ? JSON.parse(data) : null
  }

  async deleteSession(sessionId) {
    await redis.del(`session:${sessionId}`)
  }
}
```

## Environment Configuration

### Required Environment Variables

```bash
# ⚠️  CRITICAL: This MUST be set to 'production' for security
# Setting NODE_ENV=production enables DNS rebinding protection in MCP transport
NODE_ENV=production

# Server Configuration
PORT=3000
HOST=0.0.0.0
SERVER_HOSTNAME=api.your-domain.com

# MCP Security Configuration (REQUIRED for production)
# These replace the development localhost/null origin allowances
ALLOWED_ORIGINS=https://your-frontend.com,https://admin.your-domain.com
ALLOWED_HOSTS=api.your-domain.com,your-domain.com,mcp.your-domain.com

# Session Storage
REDIS_HOST=redis.your-domain.com
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
SESSION_TTL=3600

# Database (if using MongoDB)
MONGODB_URI=mongodb://username:password@mongo.your-domain.com:27017/mcp-notes

# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# SSL/TLS (if terminated at application level)
SSL_KEY_PATH=/path/to/ssl/private.key
SSL_CERT_PATH=/path/to/ssl/certificate.crt

# Monitoring
HEALTH_CHECK_PATH=/health
METRICS_PATH=/metrics
```

### Configuration Management

```javascript
// src/config/production.js
export default {
  server: {
    host: process.env.HOST || '0.0.0.0',
    port: process.env.PORT || 3000,
    hostname: process.env.SERVER_HOSTNAME
  },
  
  mcp: {
    allowedHosts: process.env.ALLOWED_HOSTS?.split(',') || [],
    allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || [],
    sessionTtl: parseInt(process.env.SESSION_TTL) || 3600
  },
  
  redis: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD
  },
  
  ssl: {
    enabled: process.env.SSL_ENABLED === 'true',
    keyPath: process.env.SSL_KEY_PATH,
    certPath: process.env.SSL_CERT_PATH
  }
}
```

## Infrastructure Requirements

### 1. Load Balancer Configuration

**Nginx Configuration Example**:
```nginx
upstream mcp_backend {
    server mcp-server-1:3000;
    server mcp-server-2:3000;
    server mcp-server-3:3000;
}

server {
    listen 443 ssl http2;
    server_name api.your-domain.com;
    
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    
    # MCP Transport endpoints need sticky sessions
    location /mcp {
        proxy_pass http://mcp_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Enable sticky sessions for MCP
        ip_hash;
        
        # Longer timeout for SSE connections
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
```

### 2. Docker Production Configuration

**docker-compose.prod.yml**:
```yaml
version: '3.8'

services:
  mcp-server:
    build:
      context: .
      dockerfile: Dockerfile.prod
    deploy:
      replicas: 3
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
        reservations:
          memory: 256M
          cpus: '0.25'
    environment:
      - NODE_ENV=production
      - PORT=3000
      - REDIS_HOST=redis
      - MONGODB_URI=mongodb://mongo:27017/mcp-notes
    depends_on:
      - redis
      - mongo
    networks:
      - mcp-network

  redis:
    image: redis:7-alpine
    deploy:
      resources:
        limits:
          memory: 256M
    volumes:
      - redis-data:/data
    networks:
      - mcp-network

  mongo:
    image: mongo:7
    deploy:
      resources:
        limits:
          memory: 512M
    volumes:
      - mongo-data:/data/db
    networks:
      - mcp-network

  nginx:
    image: nginx:alpine
    ports:
      - "443:443"
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - mcp-server
    networks:
      - mcp-network

networks:
  mcp-network:
    driver: overlay

volumes:
  redis-data:
  mongo-data:
```

## Monitoring and Observability

### 1. Health Checks

```javascript
// src/mcp/probes/health/mcp-health.js
export async function mcpHealthCheck() {
  const checks = {
    redis: await checkRedisConnection(),
    database: await checkDatabaseConnection(),
    sessions: await checkSessionCount(),
    memory: process.memoryUsage(),
    uptime: process.uptime()
  }
  
  const healthy = Object.values(checks).every(check => 
    typeof check === 'object' ? check.status === 'ok' : true
  )
  
  return {
    status: healthy ? 'ok' : 'error',
    timestamp: new Date().toISOString(),
    checks
  }
}
```

### 2. Metrics Collection

```javascript
// src/common/logging/mcp-metrics.js
import client from 'prom-client'

export const mcpMetrics = {
  activeSessionsGauge: new client.Gauge({
    name: 'mcp_active_sessions_total',
    help: 'Total number of active MCP sessions'
  }),
  
  toolCallsCounter: new client.Counter({
    name: 'mcp_tool_calls_total',
    help: 'Total number of MCP tool calls',
    labelNames: ['tool_name', 'status']
  }),
  
  sessionDurationHistogram: new client.Histogram({
    name: 'mcp_session_duration_seconds',
    help: 'MCP session duration in seconds',
    buckets: [1, 5, 10, 30, 60, 300, 600, 1800, 3600]
  })
}
```

## Security Hardening

### 1. Rate Limiting

```javascript
// src/mcp/plugins/rate-limit.js
import { RateLimiterRedis } from 'rate-limiter-flexible'

const rateLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'mcp_rate_limit',
  points: 100, // Number of requests
  duration: 60, // Per 60 seconds
})

export const rateLimitPlugin = {
  name: 'rate-limit',
  register: async (server) => {
    server.ext('onRequest', async (request, h) => {
      try {
        await rateLimiter.consume(request.info.remoteAddress)
        return h.continue
      } catch (rejRes) {
        throw Boom.tooManyRequests('Rate limit exceeded')
      }
    })
  }
}
```

### 2. Input Sanitization

```javascript
// Enhanced validation for production
import { z } from 'zod'
import DOMPurify from 'isomorphic-dompurify'

const sanitizedString = z.string().transform(val => DOMPurify.sanitize(val))

export const productionNoteSchema = {
  title: sanitizedString.min(1).max(255),
  content: sanitizedString.min(1).max(10000)
}
```

## Performance Optimizations

### 1. Connection Pooling

```javascript
// Database connection pooling
const mongoOptions = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  bufferMaxEntries: 0,
  bufferCommands: false
}
```

## Deployment Checklist

### Pre-Deployment
- [ ] Update allowed hosts configuration
- [ ] Configure CORS for production domains
- [ ] Set up Redis cluster for session storage
- [ ] Configure SSL certificates
- [ ] Set up monitoring and alerting
- [ ] Configure log aggregation
- [ ] Set up database backups
- [ ] Configure rate limiting
- [ ] Test health check endpoints

### Post-Deployment
- [ ] Verify MCP protocol functionality
- [ ] Test session persistence across restarts
- [ ] Validate SSL/TLS configuration
- [ ] Monitor application metrics
- [ ] Test load balancer configuration
- [ ] Verify backup and recovery procedures
- [ ] Test scaling scenarios
- [ ] Document runbook procedures

### Monitoring Alerts
- [ ] High memory usage (>80%)
- [ ] High session count (>1000 active)
- [ ] Redis connection failures
- [ ] Database connection failures
- [ ] SSL certificate expiration (30 days)
- [ ] High error rates (>5%)
- [ ] Response time degradation (>2s p95)

## 🔒 Critical Security Checklist

### Before Production Deployment

**⚠️ MANDATORY SECURITY CONFIGURATION**

- [ ] **✅ NODE_ENV=production** - Enables DNS rebinding protection
- [ ] **✅ Remove development origins** - No localhost/null origins in allowedOrigins
- [ ] **✅ Configure production domains** - Add your actual domains to allowedHosts
- [ ] **✅ HTTPS enforcement** - Ensure all MCP connections use HTTPS
- [ ] **✅ Validate CORS settings** - Only allow trusted frontend origins
- [ ] **✅ Session storage security** - Use Redis with proper authentication
- [ ] **✅ Remove debug endpoints** - Disable development-only routes
- [ ] **✅ Log sanitization** - Ensure no sensitive data in logs
- [ ] **✅ Rate limiting** - Implement proper rate limiting on MCP endpoints
- [ ] **✅ Monitor origins** - Set up alerts for rejected connection attempts

### Verify Security Configuration

```bash
# Test that development origins are blocked
curl -X POST https://your-domain.com/mcp \
  -H "Origin: http://localhost:3000" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"initialize","id":1}'
# Should return 403 Forbidden in production

# Test that null origins are blocked  
curl -X POST https://your-domain.com/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"initialize","id":1}'
# Should return 403 Forbidden in production
```

**🚨 SECURITY WARNING**: Failure to properly configure NODE_ENV=production will leave your MCP server vulnerable to DNS rebinding attacks and unauthorized access from development tools.

This production configuration ensures the MCP server can handle enterprise workloads while maintaining security, performance, and reliability standards.
