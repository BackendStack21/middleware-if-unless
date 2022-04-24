# Introduction
Invokes connect-like middleware if / unless routing criteria match. 
> Inspired by the [express-unless](https://www.npmjs.com/package/express-unless) module.  

## Main features
- Advanced routes matching capabilities. Uses [find-my-way](https://www.npmjs.com/package/find-my-way) or any compatible router to match the routes. 
- `iff`: execute middleware only if routing criteria is a match. Ideal use case: API gateways (see: [fast-gateway](https://www.npmjs.com/package/fast-gateway))
- `unless`: execute middleware unless routing criteria is a match.
- Arbitraty chaining of `iff -> unless` of vice-versa.
- Low overhead, blazing fast implementation. 

# Usage 
Install
```bash
npm i middleware-if-unless
```

Extending middleware
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
Execute middleware unless routing criteria is a match:
```js
const app = require('express')()
app.use(middleware.unless([
  '/not/allowed/to/hit'
]))

...
```
In this example, all requests except `[GET] /not/allowed/to/hit` will cause the middleware to be executed.

## iff
Execute middleware only if routing criteria is a match:
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
In this example, only a `[POST|DELETE|PUT|PATCH] /tasks/:id` request will cause the middleware to be executed.

# More
- Website and documentation: https://iff-unless.21no.de