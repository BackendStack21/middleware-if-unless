// Optimized handlers with minimal allocations
const createMatchHandler = (updateParams) =>
  updateParams
    ? (req, res, params) => {
        req.params = params
        return true
      }
    : () => true

const defaultHandler = () => false

// Router cache for reusing router instances
const routerCache = new WeakMap()

function normalizeEndpoint (endpoint) {
  if (typeof endpoint === 'string') {
    return { url: endpoint, methods: ['GET'], updateParams: false }
  }
  return {
    methods: endpoint.methods || ['GET'],
    url: endpoint.url,
    version: endpoint.version,
    updateParams: endpoint.updateParams || false
  }
}

module.exports = function (routerOpts = {}, routerFactory = require('find-my-way')) {
  function exec (options, isIff = true) {
    const middleware = this
    let router = null
    let customFn = null

    // Process options efficiently
    if (typeof options === 'function') {
      customFn = options
    } else {
      const endpoints = Array.isArray(options) ? options : options?.endpoints

      if (endpoints?.length) {
        // Try to get cached router first
        let cache = routerCache.get(routerOpts)
        if (!cache) {
          cache = new Map()
          routerCache.set(routerOpts, cache)
        }

        const cacheKey = JSON.stringify(endpoints)
        router = cache.get(cacheKey)

        if (!router) {
          router = routerFactory({ ...routerOpts, defaultRoute: defaultHandler })

          // Normalize and register routes
          const normalized = endpoints.map(normalizeEndpoint)
          for (const { methods, url, version, updateParams } of normalized) {
            const handler = createMatchHandler(updateParams)

            if (version) {
              router.on(methods, url, { constraints: { version } }, handler)
            } else {
              router.on(methods, url, handler)
            }
          }

          cache.set(cacheKey, router)
        }
      }

      if (options?.custom) {
        customFn = options.custom
      }
    }

    // Optimized execution function
    const result = function (req, res, next) {
      let shouldExecute = false

      if (customFn) {
        shouldExecute = customFn(req)
      } else if (router) {
        shouldExecute = router.lookup(req, res)
      }

      // Simplified logic: execute middleware if conditions match
      if ((isIff && shouldExecute) || (!isIff && !shouldExecute)) {
        return middleware(req, res, next)
      }

      return next()
    }

    // Allow chaining
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
