const iffUnless = require('../index')()
const middleware = function (req, res, next) {
  res.body = 'hit'

  return next()
}

iffUnless(middleware)

const service = require('restana')({
  defaultRoute: (req, res) => res.send(200)
})
service.use(middleware.unless([
  '/server/shutdown'
]))

service.start()
