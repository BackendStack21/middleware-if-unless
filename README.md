# middleware-if-unless
Invokes connect-like middleware if / unless routing criteria matches. Inspired on [express-unless](https://www.npmjs.com/package/express-unless) module.  

## Main features
- Advanced routes matching capabilities. Uses [find-my-way](https://www.npmjs.com/package/find-my-way) or any compatible router to match the routes. 
- `iff`: execute middleware only if the routes matches. Ideal use case: API gateways (see: [k-fastify-gateway](https://www.npmjs.com/package/k-fastify-gateway))
- `unless`: execute middleware always unless the routes matches.
- Arbitraty chaining of iff -> unless of vice-versa.
- Low overhead, crazy fast implementation. 


# Usage example
How to extend any connect-like middleware:
```js 
const iu = require('middleware-if-unless')()

const middleware = function (req, res, next) {
  res.body = 'hit'

  return next()
}

// extend middleware with iff/unless capabilities
iu(middleware)
```
## unless
Execute middleware unless routing restrictions matches:
```js
const app = require('express')()
app.use(middleware.unless([
  '/not/allowed/to/hit'
]))

...
```
In this example, all requests except `[GET] /not/allowed/to/hit` will cause the middleware to be executed.

## if
Execute middleware only if routing restrictions matches:
```js
const app = require('express')()
app.use(middleware.iff([
  {
      methods: ['POST', 'DELETE', 'PUT', 'PATCH'],
      url: '/tasks/:id'
  }
]))

...
```
### Chaining
You can optionally chain iff -> unless or vice-versa:
```js
app.use(middleware
  .iff(req => req.url.startsWith('/pets'))  // 4 check
  .iff([                                    // 3 check
    '/pets/*',
    '/pets/:id/*'
  ]).unless([                               // 2 check
    '/pets/:id/owners',
    {
      url: '/pets/:id', methods: ['DELETE'] 
    }
  ]).unless(req => req.url.endsWith('.js')) // 1 check
)
```
# Configuration
## module
```js
const iu = require('middleware-if-unless')(
  // optional router configuration: 
  // https://www.npmjs.com/package/find-my-way#findmywayoptions
  {
  }
  , 
  // optional router factory:
  // allows to override find-my-way as default router
  function(opts){}
)
```
## iff / unless
Both methods share the same configuration format:

### - routing criteria is a function 
```js
middleware.iff(req => req.url.startsWith('/pets'))
```
### - routing criteria is an array of routes
```js
middleware.iff([
  '/login', // if string is passed, the GET method is inferred
  {
    methods: ['DELETE', 'POST', '...'],
    url: '/task/:id/*'
  }
])
```
### - routing criteria is an object
```js
middleware.unless({ endpoints: [
  '/login', // if string is passed, the GET method is inferred
  {
    methods: ['DELETE', 'POST', '...'],
    url: '/task/:id/*'
  }
]})
```