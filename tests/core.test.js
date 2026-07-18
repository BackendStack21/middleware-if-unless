/* global describe, it */
const expect = require('chai').expect
const request = require('supertest')
const iffUnless = require('../index')()

const middleware = function (req, res, next) {
  res.body = 'hit'
  res.setHeader('id', req.params ? String(req.params.id) : '')

  return next()
}

describe('middleware-if-unless', () => {
  let server
  const service = require('restana')({
    defaultRoute: (req, res) => res.send(200)
  })

  it('should successfully setup the testing HTTP service', async () => {
    // extend middleware with iff-unless
    iffUnless(middleware)

    // setup execution rules
    service.use(middleware
      .iff(req => req.url.startsWith('/pets'))
      .iff([
        '/pets/*',
        '/pets/:id',
        {
          methods: ['GET'],
          url: '/pets/:id',
          version: '3.0.0',
          updateParams: true
        }
      ])
      .unless([
        '/pets/groups/list',
        {
          url: '/pets/:id', methods: ['DELETE']
        }
      ])
      .unless(req => req.url.endsWith('.js'))
      .unless([{
        url: '/pets/:id', methods: ['GET'], version: '2.x'
      }])
    )

    server = await service.start(~~process.env.PORT)
  })

  describe('iff', () => {
    it('should hit middleware using GET /pets/:id', async () => {
      await request(server)
        .get('/pets/0')
        .then((response) => {
          expect(response.text).to.equal('hit')
        })
    })

    it('should hit middleware using GET /pets/retrieve/dogs', async () => {
      await request(server)
        .get('/pets/retrieve/dogs')
        .then((response) => {
          expect(response.text).to.equal('hit')
        })
    })
  })

  describe('unless', () => {
    it('should skip middleware using DELETE /pets/0', async () => {
      await request(server)
        .del('/pets/0')
        .then((response) => {
          expect(response.text).to.equal('')
        })
    })

    it('should skip middleware using GET /pets/groups/list', async () => {
      await request(server)
        .get('/pets/groups/list')
        .then((response) => {
          expect(response.text).to.equal('')
        })
    })

    it('should skip middleware using GET *.js', async () => {
      await request(server)
        .get('/script.js')
        .then((response) => {
          expect(response.text).to.equal('')
        })
    })

    it('should skip middleware on GET /pets/:id using accept-version 2.x', async () => {
      await request(server)
        .get('/pets/0')
        .set('accept-version', '2.0.1')
        .then((response) => {
          expect(response.text).to.equal('')
        })
    })

    it('should hit middleware on GET /pets/:id using accept-version 3.x', async () => {
      await request(server)
        .get('/pets/0')
        .set('accept-version', '3.x')
        .then((response) => {
          expect(response.text).to.equal('hit')
        })
    })

    it('should get middleware route params on GET /pets/:id using accept-version 3.x', async () => {
      await request(server)
        .get('/pets/0')
        .set('accept-version', '3.x')
        .then((response) => {
          expect(response.headers.id).to.equal('0')
        })
    })
  })

  describe('router cache', () => {
    it('should not reuse a cached router for arrays sharing length, first and last endpoints', () => {
      const factory = require('../index')()
      let hits = 0
      const auth = (req, res, next) => {
        hits += 1
        return next()
      }
      const req = (url) => ({ url, method: 'GET', headers: {} })

      // both arrays map to the same legacy cache key "3|/health|/status"
      factory(auth).unless(['/health', '/admin', '/status'])
      const guarded = factory(auth).unless(['/health', '/public', '/status'])

      // /admin is not excluded by the second array: middleware must run
      guarded(req('/admin'), {}, () => {})
      expect(hits).to.equal(1)

      // /public is excluded by the second array: middleware must be skipped
      hits = 0
      guarded(req('/public'), {}, () => {})
      expect(hits).to.equal(0)
    })
  })

  it('should successfully terminate the service', async () => {
    await service.close()
  })
})
