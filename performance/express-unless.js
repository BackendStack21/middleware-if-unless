const unless = require('express-unless')
const middleware = function (req, res, next) {
  res.body = 'hit'

  return next()
}

middleware.unless = unless

const service = require('restana')({
  defaultRoute: (req, res) => res.send(200)
})
service.use(middleware.unless({
  path: ['/server/shutdown']
}))

service.start()
