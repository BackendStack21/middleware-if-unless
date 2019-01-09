const op = updateParams => (req, res, params) => {
  if (updateParams) {
    req.params = params
  }

  return true
}

module.exports = function (routerOpts = {}, routerFactory) {
  routerOpts.defaultRoute = () => false
  routerFactory = routerFactory || require('find-my-way')

  function exec (options, isIff = true) {
    const middleware = this

    // independent router instance per config
    const router = routerFactory(routerOpts)

    const opts = typeof options === 'function' ? { custom: options } : (Array.isArray(options) ? { endpoints: options } : options)
    if (opts.endpoints && opts.endpoints.length) {
      // setup matching router
      opts.endpoints
        .map(endpoint => typeof endpoint === 'string' ? { methods: ['GET'], url: endpoint } : endpoint)
        .forEach(({ methods, url, version, updateParams = false }) => {
          if (version) {
            router.on(methods, url, { version }, op(updateParams))
          } else {
            router.on(methods, url, op(updateParams))
          }
        })
    }

    const result = function (req, res, next) {
      // supporting custom matching function
      if (opts.custom) {
        if (opts.custom(req)) {
          if (isIff) {
            return middleware(req, res, next)
          }
        } else if (!isIff) {
          return middleware(req, res, next)
        }

        // leave here and do not process opts.endpoints
        return next()
      }

      // matching endpoints and moving forward
      if (router.lookup(req, res)) {
        if (isIff) {
          return middleware(req, res, next)
        }
      } else if (!isIff) {
        return middleware(req, res, next)
      }

      return next()
    }

    // allowing chaining
    result.iff = iff
    result.unless = unless

    return result
  }

  function iff (options) {
    return exec.call(this, options, true)
  }
  function unless (options) {
    return exec.call(this, options, false)
  }

  return function (middleware) {
    middleware.iff = iff
    middleware.unless = unless

    return middleware
  }
}
