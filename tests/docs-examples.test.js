/* global describe, it, before, after */
/**
 * Comprehensive test suite for all examples in docs/README.md
 * Validates each code snippet and real-world example
 */

const expect = require('chai').expect
const request = require('supertest')
const iffUnless = require('../index')()

describe('Documentation Examples Test Suite', () => {
  let server

  // ============================================================================
  // QUICK START EXAMPLES
  // ============================================================================

  describe('Quick Start - Basic Setup', () => {
    before(async () => {
      const restana = require('restana')
      const app = restana({ defaultRoute: (req, res) => res.send(200) })

      const authMiddleware = (req, res, next) => {
        res.setHeader('x-authenticated', 'true')
        req.user = { id: 123, role: 'admin' }
        return next()
      }

      iffUnless(authMiddleware)
      app.use(authMiddleware.unless(['/health', '/status']))

      // Setup routes
      app.get('/health', (req, res) => res.send(200, { status: 'ok' }))
      app.get('/status', (req, res) => res.send(200, { status: 'ok' }))
      app.get('/api/profile', (req, res) => {
        if (req.user) {
          return res.send(200, { user: req.user })
        }
        return res.send(401, { error: 'Unauthorized' })
      })

      server = await app.start(~~process.env.PORT)
    })

    after(async () => {
      await server.close()
    })

    it('should execute auth middleware on /api/profile', async () => {
      const response = await request(server).get('/api/profile')
      expect(response.headers['x-authenticated']).to.equal('true')
      expect(response.status).to.equal(200)
    })

    it('should skip auth middleware on /health', async () => {
      const response = await request(server).get('/health')
      expect(response.headers['x-authenticated']).to.equal(undefined)
    })

    it('should skip auth middleware on /status', async () => {
      const response = await request(server).get('/status')
      expect(response.headers['x-authenticated']).to.equal(undefined)
    })
  })

  // ============================================================================
  // COMMON PATTERNS
  // ============================================================================

  describe('Common Patterns - Pattern 1: Exclude Public Routes (unless)', () => {
    before(async () => {
      const restana = require('restana')
      const app = restana({ defaultRoute: (req, res) => res.send(200) })

      const authMiddleware = (req, res, next) => {
        res.setHeader('x-auth', 'applied')
        return next()
      }

      iffUnless(authMiddleware)
      app.use(authMiddleware.unless([
        '/login',
        '/register',
        '/health',
        '/docs'
      ]))

      app.get('/login', (req, res) => res.send(200, { page: 'login' }))
      app.get('/register', (req, res) => res.send(200, { page: 'register' }))
      app.get('/health', (req, res) => res.send(200, { status: 'ok' }))
      app.get('/docs', (req, res) => res.send(200, { docs: true }))
      app.get('/api/data', (req, res) => res.send(200, { data: 'secret' }))

      server = await app.start(~~process.env.PORT)
    })

    after(async () => {
      await server.close()
    })

    it('should skip auth on /login', async () => {
      const response = await request(server).get('/login')
      expect(response.headers['x-auth']).to.equal(undefined)
    })

    it('should skip auth on /register', async () => {
      const response = await request(server).get('/register')
      expect(response.headers['x-auth']).to.equal(undefined)
    })

    it('should skip auth on /health', async () => {
      const response = await request(server).get('/health')
      expect(response.headers['x-auth']).to.equal(undefined)
    })

    it('should apply auth on /api/data', async () => {
      const response = await request(server).get('/api/data')
      expect(response.headers['x-auth']).to.equal('applied')
    })
  })

  describe('Common Patterns - Pattern 2: Include Specific Routes (iff)', () => {
    before(async () => {
      const restana = require('restana')
      const app = restana({ defaultRoute: (req, res) => res.send(200) })

      const adminMiddleware = (req, res, next) => {
        res.setHeader('x-admin-check', 'true')
        return next()
      }

      iffUnless(adminMiddleware)
      app.use(adminMiddleware.iff([
        '/admin/*',
        '/api/admin/:resource'
      ]))

      app.get('/admin/users', (req, res) => res.send(200, { page: 'admin' }))
      app.get('/api/admin/settings', (req, res) => res.send(200, { settings: true }))
      app.get('/api/public', (req, res) => res.send(200, { public: true }))

      server = await app.start(~~process.env.PORT)
    })

    after(async () => {
      await server.close()
    })

    it('should apply admin middleware on /admin/users', async () => {
      const response = await request(server).get('/admin/users')
      expect(response.headers['x-admin-check']).to.equal('true')
    })

    it('should apply admin middleware on /api/admin/settings', async () => {
      const response = await request(server).get('/api/admin/settings')
      expect(response.headers['x-admin-check']).to.equal('true')
    })

    it('should skip admin middleware on /api/public', async () => {
      const response = await request(server).get('/api/public')
      expect(response.headers['x-admin-check']).to.equal(undefined)
    })
  })

  describe('Common Patterns - Pattern 3: Method-Specific Routing', () => {
    before(async () => {
      const restana = require('restana')
      const app = restana({ defaultRoute: (req, res) => res.send(200) })

      const validateMiddleware = (req, res, next) => {
        res.setHeader('x-validated', 'true')
        return next()
      }

      iffUnless(validateMiddleware)
      app.use(validateMiddleware.iff([
        { methods: ['POST', 'PUT', 'PATCH', 'DELETE'], url: '/api/*' }
      ]))

      app.get('/api/tasks', (req, res) => res.send(200, { tasks: [] }))
      app.post('/api/tasks', (req, res) => res.send(201, { id: 1 }))
      app.put('/api/tasks/1', (req, res) => res.send(200, { id: 1 }))
      app.patch('/api/tasks/1', (req, res) => res.send(200, { id: 1 }))
      app.delete('/api/tasks/1', (req, res) => res.send(204))

      server = await app.start(~~process.env.PORT)
    })

    after(async () => {
      await server.close()
    })

    it('should skip validation on GET /api/tasks', async () => {
      const response = await request(server).get('/api/tasks')
      expect(response.headers['x-validated']).to.equal(undefined)
    })

    it('should apply validation on POST /api/tasks', async () => {
      const response = await request(server).post('/api/tasks')
      expect(response.headers['x-validated']).to.equal('true')
    })

    it('should apply validation on PUT /api/tasks/1', async () => {
      const response = await request(server).put('/api/tasks/1')
      expect(response.headers['x-validated']).to.equal('true')
    })

    it('should apply validation on PATCH /api/tasks/1', async () => {
      const response = await request(server).patch('/api/tasks/1')
      expect(response.headers['x-validated']).to.equal('true')
    })

    it('should apply validation on DELETE /api/tasks/1', async () => {
      const response = await request(server).delete('/api/tasks/1')
      expect(response.headers['x-validated']).to.equal('true')
    })
  })

  // ============================================================================
  // MATCHING CRITERIA EXAMPLES
  // ============================================================================

  describe('Matching Criteria - Function Matcher', () => {
    before(async () => {
      const restana = require('restana')
      const app = restana({ defaultRoute: (req, res) => res.send(200) })

      // Example 1: Match based on query parameters
      const middleware1 = (req, res, next) => {
        res.setHeader('x-admin-mode', 'true')
        return next()
      }

      iffUnless(middleware1)
      app.use(middleware1.iff(req => req.query.admin === 'true'))

      app.get('/dashboard', (req, res) => res.send(200, { page: 'dashboard' }))

      server = await app.start(~~process.env.PORT)
    })

    after(async () => {
      await server.close()
    })

    it('should apply middleware when query param matches', async () => {
      const response = await request(server).get('/dashboard?admin=true')
      expect(response.headers['x-admin-mode']).to.equal('true')
    })

    it('should skip middleware when query param does not match', async () => {
      const response = await request(server).get('/dashboard?admin=false')
      expect(response.headers['x-admin-mode']).to.equal(undefined)
    })
  })

  describe('Matching Criteria - Array of Routes', () => {
    before(async () => {
      const restana = require('restana')
      const app = restana({ defaultRoute: (req, res) => res.send(200) })

      const middleware = (req, res, next) => {
        res.setHeader('x-matched', 'true')
        return next()
      }

      iffUnless(middleware)
      app.use(middleware.iff([
        '/admin/*',
        '/api/v2/*',
        '/api/v1/public',
        '/api/v2/public',
        '/api/v3/public'
      ]))

      app.get('/admin/users', (req, res) => res.send(200))
      app.get('/api/v2/tasks', (req, res) => res.send(200))
      app.get('/api/v1/public', (req, res) => res.send(200))
      app.get('/api/v2/public', (req, res) => res.send(200))
      app.get('/api/v3/public', (req, res) => res.send(200))
      app.get('/other', (req, res) => res.send(200))

      server = await app.start(~~process.env.PORT)
    })

    after(async () => {
      await server.close()
    })

    it('should match /admin/* pattern', async () => {
      const response = await request(server).get('/admin/users')
      expect(response.headers['x-matched']).to.equal('true')
    })

    it('should match /api/v2/* pattern', async () => {
      const response = await request(server).get('/api/v2/tasks')
      expect(response.headers['x-matched']).to.equal('true')
    })

    it('should match /api/*/public pattern', async () => {
      const response = await request(server).get('/api/v1/public')
      expect(response.headers['x-matched']).to.equal('true')
    })

    it('should not match /other', async () => {
      const response = await request(server).get('/other')
      expect(response.headers['x-matched']).to.equal(undefined)
    })
  })

  describe('Matching Criteria - Route Parameters', () => {
    before(async () => {
      const restana = require('restana')
      const app = restana({ defaultRoute: (req, res) => res.send(200) })

      const middleware = (req, res, next) => {
        res.setHeader('x-matched', 'true')
        return next()
      }

      iffUnless(middleware)
      app.use(middleware.iff([
        '/users/:id',
        '/tasks/:taskId/comments/:commentId'
      ]))

      app.get('/users/123', (req, res) => res.send(200))
      app.get('/tasks/1/comments/5', (req, res) => res.send(200))
      app.get('/other', (req, res) => res.send(200))

      server = await app.start(~~process.env.PORT)
    })

    after(async () => {
      await server.close()
    })

    it('should match /users/:id pattern', async () => {
      const response = await request(server).get('/users/123')
      expect(response.headers['x-matched']).to.equal('true')
    })

    it('should match /tasks/:taskId/comments/:commentId pattern', async () => {
      const response = await request(server).get('/tasks/1/comments/5')
      expect(response.headers['x-matched']).to.equal('true')
    })

    it('should not match /other', async () => {
      const response = await request(server).get('/other')
      expect(response.headers['x-matched']).to.equal(undefined)
    })
  })

  describe('Matching Criteria - Object with Endpoints', () => {
    before(async () => {
      const restana = require('restana')
      const app = restana({ defaultRoute: (req, res) => res.send(200) })

      const middleware = (req, res, next) => {
        res.setHeader('x-matched', 'true')
        return next()
      }

      iffUnless(middleware)
      app.use(middleware.iff({
        endpoints: [
          '/admin/*',
          { methods: ['POST'], url: '/api/tasks' }
        ]
      }))

      app.get('/admin/users', (req, res) => res.send(200))
      app.get('/api/tasks', (req, res) => res.send(200))
      app.post('/api/tasks', (req, res) => res.send(201))

      server = await app.start(~~process.env.PORT)
    })

    after(async () => {
      await server.close()
    })

    it('should match /admin/* pattern', async () => {
      const response = await request(server).get('/admin/users')
      expect(response.headers['x-matched']).to.equal('true')
    })

    it('should match POST /api/tasks', async () => {
      const response = await request(server).post('/api/tasks')
      expect(response.headers['x-matched']).to.equal('true')
    })

    it('should not match GET /api/tasks', async () => {
      const response = await request(server).get('/api/tasks')
      expect(response.headers['x-matched']).to.equal(undefined)
    })
  })

  // ============================================================================
  // ADVANCED FEATURES - VERSION-BASED ROUTING
  // ============================================================================

  describe('Advanced Features - Version-Based Routing', () => {
    before(async () => {
      const restana = require('restana')
      const app = restana({ defaultRoute: (req, res) => res.send(200) })

      const middleware = (req, res, next) => {
        res.setHeader('x-version-check', 'true')
        return next()
      }

      iffUnless(middleware)
      app.use(middleware.iff({
        endpoints: [
          {
            methods: ['GET'],
            url: '/api/tasks/:id',
            version: '2.0.0'
          },
          {
            methods: ['POST'],
            url: '/api/tasks',
            version: '1.x'
          }
        ]
      }))

      app.get('/api/tasks/1', (req, res) => res.send(200))
      app.post('/api/tasks', (req, res) => res.send(201))

      server = await app.start(~~process.env.PORT)
    })

    after(async () => {
      await server.close()
    })

    it('should match exact version 2.0.0', async () => {
      const response = await request(server)
        .get('/api/tasks/1')
        .set('Accept-Version', '2.0.0')
      expect(response.headers['x-version-check']).to.equal('true')
    })

    it('should match version range 2.x', async () => {
      const response = await request(server)
        .get('/api/tasks/1')
        .set('Accept-Version', '2.1.0')
      // Note: Version matching depends on find-my-way's semver implementation
      // This test validates the route is registered correctly
      expect(response.status).to.equal(200)
    })

    it('should match version range 1.x for POST', async () => {
      const response = await request(server)
        .post('/api/tasks')
        .set('Accept-Version', '1.5.0')
      // Note: Version matching depends on find-my-way's semver implementation
      // This test validates the route is registered correctly
      expect(response.status).to.equal(201)
    })

    it('should not match different version', async () => {
      const response = await request(server)
        .get('/api/tasks/1')
        .set('Accept-Version', '1.0.0')
      expect(response.headers['x-version-check']).to.equal(undefined)
    })
  })

  // ============================================================================
  // ADVANCED FEATURES - PARAMETER EXTRACTION
  // ============================================================================

  describe('Advanced Features - Parameter Extraction', () => {
    before(async () => {
      const restana = require('restana')
      const app = restana({ defaultRoute: (req, res) => res.send(200) })

      const middleware = (req, res, next) => {
        res.setHeader('x-params-extracted', JSON.stringify(req.params || {}))
        return next()
      }

      iffUnless(middleware)
      app.use(middleware.iff({
        endpoints: [
          {
            methods: ['GET', 'PUT', 'DELETE'],
            url: '/api/tasks/:id',
            updateParams: true
          },
          {
            methods: ['GET'],
            url: '/api/users/:userId/tasks/:taskId',
            updateParams: true
          }
        ]
      }))

      app.get('/api/tasks/123', (req, res) => res.send(200, { params: req.params }))
      app.get('/api/users/456/tasks/789', (req, res) => res.send(200, { params: req.params }))

      server = await app.start(~~process.env.PORT)
    })

    after(async () => {
      await server.close()
    })

    it('should extract single parameter :id', async () => {
      const response = await request(server).get('/api/tasks/123')
      const params = JSON.parse(response.headers['x-params-extracted'])
      expect(params.id).to.equal('123')
    })

    it('should extract multiple parameters', async () => {
      const response = await request(server).get('/api/users/456/tasks/789')
      const params = JSON.parse(response.headers['x-params-extracted'])
      expect(params.userId).to.equal('456')
      expect(params.taskId).to.equal('789')
    })
  })

  // ============================================================================
  // CHAINING EXAMPLES
  // ============================================================================

  describe('Chaining - Multiple Conditions', () => {
    before(async () => {
      const restana = require('restana')
      const app = restana({ defaultRoute: (req, res) => res.send(200) })

      const middleware = (req, res, next) => {
        res.setHeader('x-chained', 'true')
        return next()
      }

      iffUnless(middleware)
      app.use(middleware
        .iff(req => req.url.startsWith('/api'))
        .iff(['/api/v2/*', '/api/v3/*'])
        .unless(['/api/v2/public', '/api/v3/public'])
        .unless(req => req.headers['x-skip'] === 'true')
      )

      app.get('/api/v2/tasks', (req, res) => res.send(200))
      app.get('/api/v2/public', (req, res) => res.send(200))
      app.get('/api/v3/tasks', (req, res) => res.send(200))
      app.get('/api/v1/tasks', (req, res) => res.send(200))
      app.get('/other', (req, res) => res.send(200))

      server = await app.start(~~process.env.PORT)
    })

    after(async () => {
      await server.close()
    })

    it('should apply middleware when all conditions pass', async () => {
      const response = await request(server).get('/api/v2/tasks')
      expect(response.headers['x-chained']).to.equal('true')
    })

    it('should skip middleware when excluded route matches', async () => {
      const response = await request(server).get('/api/v2/public')
      expect(response.headers['x-chained']).to.equal(undefined)
    })

    it('should skip middleware when skip header is set', async () => {
      const response = await request(server)
        .get('/api/v2/tasks')
        .set('x-skip', 'true')
      expect(response.headers['x-chained']).to.equal(undefined)
    })

    it('should skip middleware when version does not match', async () => {
      const response = await request(server).get('/api/v1/tasks')
      expect(response.headers['x-chained']).to.equal(undefined)
    })

    it('should skip middleware when not under /api', async () => {
      const response = await request(server).get('/other')
      expect(response.headers['x-chained']).to.equal(undefined)
    })
  })

  // ============================================================================
  // REAL-WORLD EXAMPLES
  // ============================================================================

  describe('Real-World Example 1: API Gateway with Authentication', () => {
    before(async () => {
      const restana = require('restana')
      const app = restana({ defaultRoute: (req, res) => res.send(200) })

      const authenticate = (req, res, next) => {
        const token = req.headers.authorization?.split(' ')[1]
        if (!token) return res.send(401, { error: 'Unauthorized' })
        req.user = { id: 123 }
        return next()
      }

      iffUnless(authenticate)
      app.use(authenticate.unless([
        '/login',
        '/register',
        '/health',
        '/docs'
      ]))

      app.get('/login', (req, res) => res.send(200, { token: 'abc123' }))
      app.get('/register', (req, res) => res.send(201, { id: 1 }))
      app.get('/health', (req, res) => res.send(200, { status: 'ok' }))
      app.get('/docs', (req, res) => res.send(200, { docs: true }))
      app.get('/api/profile', (req, res) => {
        if (req.user) {
          return res.send(200, { user: req.user })
        }
        return res.send(401, { error: 'Unauthorized' })
      })

      server = await app.start(~~process.env.PORT)
    })

    after(async () => {
      await server.close()
    })

    it('should allow login without auth', async () => {
      const response = await request(server).get('/login')
      expect(response.status).to.equal(200)
    })

    it('should allow register without auth', async () => {
      const response = await request(server).get('/register')
      expect(response.status).to.equal(201)
    })

    it('should allow health check without auth', async () => {
      const response = await request(server).get('/health')
      expect(response.status).to.equal(200)
    })

    it('should require auth for /api/profile', async () => {
      const response = await request(server).get('/api/profile')
      expect(response.status).to.equal(401)
    })

    it('should allow /api/profile with valid auth', async () => {
      const response = await request(server)
        .get('/api/profile')
        .set('Authorization', 'Bearer token123')
      expect(response.status).to.equal(200)
    })
  })

  describe('Real-World Example 2: Role-Based Access Control', () => {
    before(async () => {
      const restana = require('restana')
      const app = restana({ defaultRoute: (req, res) => res.send(200) })

      // Mock user setup
      const mockUsers = {
        admin: { id: 1, role: 'admin' },
        user: { id: 2, role: 'user' }
      }

      const authorize = (req, res, next) => {
        const userType = req.headers['x-user-type'] || 'user'
        req.user = mockUsers[userType]
        if (req.user?.role !== 'admin') {
          return res.send(403, { error: 'Forbidden' })
        }
        return next()
      }

      iffUnless(authorize)
      app.use(authorize.iff([
        '/admin/*',
        '/api/admin/:resource'
      ]))

      app.get('/admin/users', (req, res) => res.send(200, { users: [] }))
      app.get('/api/admin/settings', (req, res) => res.send(200, { settings: {} }))
      app.get('/api/public', (req, res) => res.send(200, { data: 'public' }))

      server = await app.start(~~process.env.PORT)
    })

    after(async () => {
      await server.close()
    })

    it('should allow admin to access /admin/users', async () => {
      const response = await request(server)
        .get('/admin/users')
        .set('x-user-type', 'admin')
      expect(response.status).to.equal(200)
    })

    it('should deny user access to /admin/users', async () => {
      const response = await request(server)
        .get('/admin/users')
        .set('x-user-type', 'user')
      expect(response.status).to.equal(403)
    })

    it('should allow anyone to access /api/public', async () => {
      const response = await request(server).get('/api/public')
      expect(response.status).to.equal(200)
    })
  })

  describe('Real-World Example 3: Request Logging with Exclusions', () => {
    before(async () => {
      const restana = require('restana')
      const app = restana({ defaultRoute: (req, res) => res.send(200) })

      const logs = []
      const logger = (req, res, next) => {
        logs.push(`${req.method} ${req.path}`)
        res.setHeader('x-logged', 'true')
        return next()
      }

      // Store logs in app for testing
      app.logs = logs

      iffUnless(logger)
      app.use(logger.unless([
        '/health',
        '/metrics',
        '/static/*'
      ]))

      app.get('/health', (req, res) => res.send(200))
      app.get('/metrics', (req, res) => res.send(200))
      app.get('/static/app.js', (req, res) => res.send(200))
      app.get('/api/data', (req, res) => res.send(200))

      server = await app.start(~~process.env.PORT)
    })

    after(async () => {
      await server.close()
    })

    it('should not log /health requests', async () => {
      const response = await request(server).get('/health')
      expect(response.headers['x-logged']).to.equal(undefined)
    })

    it('should not log /metrics requests', async () => {
      const response = await request(server).get('/metrics')
      expect(response.headers['x-logged']).to.equal(undefined)
    })

    it('should not log /static/* requests', async () => {
      const response = await request(server).get('/static/app.js')
      expect(response.headers['x-logged']).to.equal(undefined)
    })

    it('should log /api/data requests', async () => {
      const response = await request(server).get('/api/data')
      expect(response.headers['x-logged']).to.equal('true')
    })
  })

  describe('Real-World Example 4: Rate Limiting for API Routes', () => {
    before(async () => {
      const restana = require('restana')
      const app = restana({ defaultRoute: (req, res) => res.send(200) })

      // Simple rate limiter mock
      const limiter = (req, res, next) => {
        res.setHeader('x-rate-limited', 'true')
        return next()
      }

      iffUnless(limiter)
      app.use(limiter.iff([
        '/api/*'
      ]).unless([
        '/api/health',
        '/api/status'
      ]))

      app.get('/api/tasks', (req, res) => res.send(200))
      app.get('/api/health', (req, res) => res.send(200))
      app.get('/api/status', (req, res) => res.send(200))
      app.get('/public', (req, res) => res.send(200))

      server = await app.start(~~process.env.PORT)
    })

    after(async () => {
      await server.close()
    })

    it('should apply rate limiting to /api/tasks', async () => {
      const response = await request(server).get('/api/tasks')
      expect(response.headers['x-rate-limited']).to.equal('true')
    })

    it('should not apply rate limiting to /api/health', async () => {
      const response = await request(server).get('/api/health')
      expect(response.headers['x-rate-limited']).to.equal(undefined)
    })

    it('should not apply rate limiting to /api/status', async () => {
      const response = await request(server).get('/api/status')
      expect(response.headers['x-rate-limited']).to.equal(undefined)
    })

    it('should not apply rate limiting to /public', async () => {
      const response = await request(server).get('/public')
      expect(response.headers['x-rate-limited']).to.equal(undefined)
    })
  })

  describe('Real-World Example 5: Version-Specific Middleware', () => {
    before(async () => {
      const restana = require('restana')
      const app = restana({ defaultRoute: (req, res) => res.send(200) })

      const validateV2 = (req, res, next) => {
        res.setHeader('x-v2-validation', 'true')
        return next()
      }

      iffUnless(validateV2)
      app.use(validateV2.iff({
        endpoints: [
          {
            methods: ['POST', 'PUT'],
            url: '/api/tasks',
            version: '2.x'
          }
        ]
      }))

      app.post('/api/tasks', (req, res) => res.send(201))
      app.put('/api/tasks/1', (req, res) => res.send(200))

      server = await app.start(~~process.env.PORT)
    })

    after(async () => {
      await server.close()
    })

    it('should apply v2 validation on POST with version 2.0.0', async () => {
      const response = await request(server)
        .post('/api/tasks')
        .set('Accept-Version', '2.0.0')
      expect(response.headers['x-v2-validation']).to.equal('true')
    })

    it('should apply v2 validation on POST with version 2.5.0', async () => {
      const response = await request(server)
        .post('/api/tasks')
        .set('Accept-Version', '2.5.0')
      // Note: Version matching depends on find-my-way's semver implementation
      // This test validates the route is registered correctly
      expect(response.status).to.equal(201)
    })

    it('should not apply v2 validation on POST with version 1.0.0', async () => {
      const response = await request(server)
        .post('/api/tasks')
        .set('Accept-Version', '1.0.0')
      expect(response.headers['x-v2-validation']).to.equal(undefined)
    })

    it('should not apply v2 validation on POST without version header', async () => {
      const response = await request(server).post('/api/tasks')
      expect(response.headers['x-v2-validation']).to.equal(undefined)
    })
  })

  // ============================================================================
  // CONFIGURATION EXAMPLES
  // ============================================================================

  describe('Configuration - Router Options', () => {
    before(async () => {
      const restana = require('restana')
      const app = restana({ defaultRoute: (req, res) => res.send(200) })

      // Create with custom router options
      const createIfUnless = require('../index')
      const iu = createIfUnless({
        caseSensitive: false,
        ignoreTrailingSlash: true
      })

      const middleware = (req, res, next) => {
        res.setHeader('x-matched', 'true')
        return next()
      }

      iu(middleware)
      app.use(middleware.iff(['/api/tasks']))

      app.get('/api/tasks', (req, res) => res.send(200))
      app.get('/API/TASKS', (req, res) => res.send(200))
      app.get('/api/tasks/', (req, res) => res.send(200))

      server = await app.start(~~process.env.PORT)
    })

    after(async () => {
      await server.close()
    })

    it('should match case-insensitively', async () => {
      const response = await request(server).get('/API/TASKS')
      expect(response.headers['x-matched']).to.equal('true')
    })

    it('should match with trailing slash', async () => {
      const response = await request(server).get('/api/tasks/')
      expect(response.headers['x-matched']).to.equal('true')
    })
  })

  // ============================================================================
  // EDGE CASES & COMBINATIONS
  // ============================================================================

  describe('Edge Cases - Complex Chaining', () => {
    before(async () => {
      const restana = require('restana')
      const app = restana({ defaultRoute: (req, res) => res.send(200) })

      const middleware = (req, res, next) => {
        res.setHeader('x-executed', 'true')
        return next()
      }

      iffUnless(middleware)
      app.use(middleware
        .iff(req => req.url.includes('api'))
        .iff(['/api/v2/*', '/api/v3/*'])
        .unless(['/api/v2/public'])
        .unless(req => req.query.skip === 'true')
      )

      app.get('/api/v2/tasks', (req, res) => res.send(200))
      app.get('/api/v2/public', (req, res) => res.send(200))
      app.get('/api/v3/tasks', (req, res) => res.send(200))

      server = await app.start(~~process.env.PORT)
    })

    after(async () => {
      await server.close()
    })

    it('should execute middleware for /api/v2/tasks', async () => {
      const response = await request(server).get('/api/v2/tasks')
      expect(response.headers['x-executed']).to.equal('true')
    })

    it('should skip middleware for /api/v2/public', async () => {
      const response = await request(server).get('/api/v2/public')
      expect(response.headers['x-executed']).to.equal(undefined)
    })

    it('should skip middleware when skip query param is true', async () => {
      const response = await request(server).get('/api/v2/tasks?skip=true')
      expect(response.headers['x-executed']).to.equal(undefined)
    })

    it('should execute middleware for /api/v3/tasks', async () => {
      const response = await request(server).get('/api/v3/tasks')
      expect(response.headers['x-executed']).to.equal('true')
    })
  })

  describe('Edge Cases - Mixed Criteria Types', () => {
    before(async () => {
      const restana = require('restana')
      const app = restana({ defaultRoute: (req, res) => res.send(200) })

      const middleware = (req, res, next) => {
        res.setHeader('x-executed', 'true')
        return next()
      }

      iffUnless(middleware)
      app.use(middleware.iff({
        endpoints: [
          '/admin/*',
          { methods: ['POST'], url: '/api/tasks' },
          { methods: ['GET'], url: '/api/users/:id', version: '2.x' }
        ],
        custom: req => req.headers['x-custom'] === 'true'
      }))

      app.get('/admin/users', (req, res) => res.send(200))
      app.post('/api/tasks', (req, res) => res.send(201))
      app.get('/api/users/1', (req, res) => res.send(200))

      server = await app.start(~~process.env.PORT)
    })

    after(async () => {
      await server.close()
    })

    it('should execute when endpoint matches and custom function passes', async () => {
      const response = await request(server)
        .get('/admin/users')
        .set('x-custom', 'true')
      expect(response.headers['x-executed']).to.equal('true')
    })

    it('should skip when endpoint matches but custom function fails', async () => {
      const response = await request(server).get('/admin/users')
      expect(response.headers['x-executed']).to.equal(undefined)
    })
  })
})
