# middleware-if-unless Documentation

<img src="logo.svg" width="400">

## Overview

**middleware-if-unless** is a high-performance routing middleware for Node.js that conditionally executes connect-like middleware based on route matching criteria. It provides two core operations:

- **`iff`** (if-first): Execute middleware **only if** routing criteria match
- **`unless`**: Execute middleware **unless** routing criteria match

> Inspired by [express-unless](https://www.npmjs.com/package/express-unless), but significantly faster with advanced routing capabilities.

### Key Features

| Feature                     | Benefit                                                                                                                              |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **Advanced Route Matching** | Uses [find-my-way](https://www.npmjs.com/package/find-my-way) router for fast, flexible route patterns with parameters and wildcards |
| **Conditional Execution**   | `iff` for inclusion-based routing, `unless` for exclusion-based routing                                                              |
| **Chainable API**           | Combine multiple `iff` and `unless` conditions in a single middleware stack                                                          |
| **Version Support**         | Route based on `Accept-Version` header with semver matching                                                                          |
| **Parameter Extraction**    | Automatically extract and populate `req.params` from matched routes                                                                  |
| **Low Overhead**            | Optimized for production with minimal performance impact                                                                             |
| **Custom Matchers**         | Use functions for complex, dynamic routing logic                                                                                     |
| **Router Agnostic**         | Pluggable router factory for custom routing implementations                                                                          |

---

## Installation

```bash
npm install middleware-if-unless
```

**Requirements:** Node.js >= 22.0.0

---

## Quick Start

### Basic Setup

```js
const express = require("express");
const createIfUnless = require("middleware-if-unless");

const app = express();
const iu = createIfUnless();

// Create a middleware to extend
const authMiddleware = (req, res, next) => {
  console.log("Authenticating request...");
  req.user = { id: 123, role: "admin" };
  next();
};

// Extend middleware with iff/unless capabilities
iu(authMiddleware);

// Now use it with routing conditions
app.use(authMiddleware.unless(["/health", "/status"]));

app.listen(3000);
```

### Common Patterns

#### Pattern 1: Exclude Public Routes (unless)

```js
// Run auth middleware on all routes EXCEPT public ones
app.use(authMiddleware.unless(["/login", "/register", "/health", "/docs"]));
```

#### Pattern 2: Include Specific Routes (iff)

```js
// Run admin middleware ONLY on admin routes
app.use(adminMiddleware.iff(["/admin/*", "/api/admin/:resource"]));
```

#### Pattern 3: Method-Specific Routing

```js
// Run validation middleware only on write operations
app.use(validateMiddleware.iff([{ methods: ["POST", "PUT", "PATCH", "DELETE"], url: "/api/*" }]));
```

---

## API Reference

### `createIfUnless(routerOptions?, routerFactory?)`

Factory function that returns a middleware extender.

**Parameters:**

- `routerOptions` (object, optional): Configuration passed to the router. See [find-my-way options](https://www.npmjs.com/package/find-my-way#findmywayoptions)
- `routerFactory` (function, optional): Custom router factory. Defaults to `find-my-way`

**Returns:** A function that extends middleware with `iff` and `unless` methods

**Example:**

```js
// With custom router options
const iu = createIfUnless({
  caseSensitive: false,
  ignoreTrailingSlash: true,
});

// With custom router factory
const iu = createIfUnless({}, customRouterFactory);
```

---

### `middleware.iff(criteria)`

Execute middleware **only if** the routing criteria match.

**Parameters:**

- `criteria` (function | array | object): Matching criteria

**Returns:** Extended middleware with chainable `iff` and `unless` methods

**Use Cases:**

- API gateways (apply middleware to specific routes only)
- Role-based access control (apply to admin routes)
- Version-specific middleware (apply to v2 API endpoints)

**Examples:**

```js
// Function-based matching
app.use(middleware.iff((req) => req.url.startsWith("/api")));

// Array of route strings
app.use(middleware.iff(["/admin/*", "/api/v2/*"]));

// Array of route objects with methods
app.use(
  middleware.iff([
    { methods: ["POST", "PUT"], url: "/tasks/:id" },
    { methods: ["DELETE"], url: "/tasks/:id" },
  ]),
);

// Object with endpoints array
app.use(
  middleware.iff({
    endpoints: ["/admin/*", "/api/admin/:resource"],
  }),
);
```

---

### `middleware.unless(criteria)`

Execute middleware **unless** the routing criteria match.

**Parameters:**

- `criteria` (function | array | object): Matching criteria

**Returns:** Extended middleware with chainable `iff` and `unless` methods

**Use Cases:**

- Skip middleware for public routes
- Exclude health checks from logging
- Bypass authentication for specific endpoints

**Examples:**

```js
// Function-based matching
app.use(middleware.unless((req) => req.path === "/health"));

// Array of route strings
app.use(middleware.unless(["/login", "/register", "/health", "/metrics"]));

// Array of route objects
app.use(
  middleware.unless([
    { methods: ["GET"], url: "/public/*" },
    { methods: ["GET"], url: "/docs" },
  ]),
);

// Object with endpoints array
app.use(
  middleware.unless({
    endpoints: ["/health", "/status", "/metrics"],
  }),
);
```

---

## Matching Criteria

### 1. Function Matcher

Use a custom function for complex logic. The function receives the request object and should return `true` to match.

```js
// Match requests from specific IP ranges
middleware.iff((req) => {
  const ip = req.ip || req.connection.remoteAddress;
  return ip.startsWith("192.168.");
});

// Match requests with specific headers
middleware.unless((req) => {
  return req.headers["x-skip-middleware"] === "true";
});

// Match based on query parameters
middleware.iff((req) => {
  return req.query.admin === "true";
});
```

**Pros:** Maximum flexibility, dynamic logic
**Cons:** Runs on every request, no caching

---

### 2. Array of Routes

Provide an array of route patterns. Strings default to GET method.

```js
// Simple string routes (GET method inferred)
middleware.unless(["/login", "/register", "/health"]);

// Mixed strings and route objects
middleware.iff(["/public/*", { methods: ["GET"], url: "/docs" }, { methods: ["POST", "PUT"], url: "/api/tasks/:id" }]);

// Wildcard patterns
middleware.iff([
  "/admin/*", // matches /admin/users, /admin/settings, etc.
  "/api/v2/*", // matches /api/v2/tasks, /api/v2/users, etc.
  "/api/*/public", // matches /api/v1/public, /api/v2/public, etc.
]);

// Route parameters
middleware.iff(["/users/:id", "/tasks/:taskId/comments/:commentId"]);
```

**Pros:** Simple, cached for performance
**Cons:** Limited to static patterns

---

### 3. Object with Endpoints

Provide an object with an `endpoints` array and optional `custom` function.

```js
// Basic endpoints object
middleware.iff({
  endpoints: ["/admin/*", { methods: ["POST"], url: "/api/tasks" }],
});

// With custom function (runs after route matching)
middleware.iff({
  endpoints: ["/api/*"],
  custom: (req) => req.user?.role === "admin",
});

// Combining multiple conditions
middleware.unless({
  endpoints: ["/health", "/metrics"],
  custom: (req) => req.headers["x-internal"] === "true",
});
```

**Pros:** Flexible, supports both routes and custom logic
**Cons:** Slightly more verbose

---

## Advanced Features

### Version-Based Routing

Route middleware execution based on the `Accept-Version` header using semver matching.

```js
middleware.iff({
  endpoints: [
    {
      methods: ["GET"],
      url: "/api/tasks/:id",
      version: "2.0.0",
    },
    {
      methods: ["POST"],
      url: "/api/tasks",
      version: "1.x", // matches 1.0.0, 1.1.0, 1.2.3, etc.
    },
  ],
});
```

**Matching Examples:**

- `version: '2.0.0'` matches `Accept-Version: 2.0.0`
- `version: '2.x'` matches `Accept-Version: 2.0.0`, `2.1.0`, `2.99.99`
- `version: '2.0.x'` matches `Accept-Version: 2.0.0`, `2.0.1`, `2.0.99`

**Use Cases:**

- Different middleware for different API versions
- Gradual API migration
- Feature flags based on client version

---

### Parameter Extraction

Automatically extract route parameters and populate `req.params` from matched routes.

```js
middleware.iff({
  endpoints: [
    {
      methods: ["GET", "PUT", "DELETE"],
      url: "/api/tasks/:id",
      updateParams: true, // Extract :id parameter
    },
    {
      methods: ["GET"],
      url: "/api/users/:userId/tasks/:taskId",
      updateParams: true, // Extract both :userId and :taskId
    },
  ],
});

// In your middleware or route handler
app.get("/api/tasks/:id", (req, res) => {
  console.log(req.params.id); // Extracted from route
  res.json({ taskId: req.params.id });
});
```

**Benefits:**

- Consistent parameter extraction across middleware
- Useful for business-specific middleware
- Simplifies downstream route handlers

---

## Chaining

Combine multiple `iff` and `unless` conditions to create complex routing logic.

```js
app.use(
  middleware
    .iff((req) => req.url.startsWith("/api")) // 1st check: must start with /api
    .iff(["/api/v2/*", "/api/v3/*"]) // 2nd check: must be v2 or v3
    .unless(["/api/v2/public", "/api/v3/public"]) // 3rd check: exclude public routes
    .unless((req) => req.headers["x-skip"] === "true"), // 4th check: exclude if header set
);
```

**Execution Order:**
Conditions are evaluated left-to-right. The middleware executes only if **all** conditions pass.

**Practical Example:**

```js
// Apply rate limiting to API routes, except public endpoints and health checks
app.use(
  rateLimitMiddleware
    .iff(["/api/*"]) // Only API routes
    .unless(["/api/health", "/api/status"]) // Except health/status
    .unless((req) => req.ip === "127.0.0.1"), // Except localhost
);
```

---

## Configuration

### Router Options

Pass options to customize the underlying router behavior:

```js
const iu = createIfUnless({
  caseSensitive: false, // Ignore case in route matching
  ignoreTrailingSlash: true, // Treat /api and /api/ as same
  maxParamLength: 100, // Max length of URL parameters
  allowUnsafeRegex: false, // Disable unsafe regex patterns
});
```

See [find-my-way options](https://www.npmjs.com/package/find-my-way#findmywayoptions) for complete list.

---

## Real-World Examples

### Example 1: API Gateway with Authentication

```js
const express = require("express");
const createIfUnless = require("middleware-if-unless");

const app = express();
const iu = createIfUnless();

// Authentication middleware
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  req.user = { id: 123 };
  next();
};

// Apply auth to all routes except public ones
iu(authenticate);
app.use(authenticate.unless(["/login", "/register", "/health", "/docs"]));

app.get("/api/profile", (req, res) => {
  res.json({ user: req.user });
});
```

### Example 2: Role-Based Access Control

```js
const authorize = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
};

iu(authorize);
app.use(authorize.iff(["/admin/*", "/api/admin/:resource"]));
```

### Example 3: Request Logging with Exclusions

```js
const logger = (req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
};

iu(logger);
app.use(logger.unless(["/health", "/metrics", "/static/*"]));
```

### Example 4: Rate Limiting for API Routes

```js
const rateLimit = require("express-rate-limit");
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });

iu(limiter);
app.use(limiter.iff(["/api/*"]).unless(["/api/health", "/api/status"]));
```

### Example 5: Version-Specific Middleware

```js
const validateV2 = (req, res, next) => {
  // V2-specific validation
  next();
};

iu(validateV2);
app.use(
  validateV2.iff({
    endpoints: [
      {
        methods: ["POST", "PUT"],
        url: "/api/tasks",
        version: "2.x",
      },
    ],
  }),
);
```

---

## TypeScript Support

Full TypeScript definitions are included:

```ts
import createIfUnless from "middleware-if-unless";
import { Request, Response, NextFunction } from "express";

const iu = createIfUnless();

const middleware = (req: Request, res: Response, next: NextFunction) => {
  res.locals.processed = true;
  next();
};

iu(middleware);

// Type-safe chaining
app.use(middleware.iff(["/api/*"]).unless(["/api/health"]));
```

---

## Performance Considerations

### Optimization Tips

1. **Use array routes over functions** - Array routes are cached and faster
2. **Order conditions by likelihood** - Put most common matches first
3. **Use specific patterns** - `/api/tasks/:id` is faster than `/api/*`
4. **Avoid complex custom functions** - Keep custom matchers simple and fast
5. **Reuse middleware instances** - Don't create new middleware for each route

### Benchmarks

Compared to [express-unless](https://www.npmjs.com/package/express-unless):

- **15-20% faster** on average
- **Optimized caching** for route matching
- **Reduced memory overhead** with pre-created handlers

---

## Troubleshooting

### Middleware Not Executing

**Problem:** Middleware doesn't run when expected

**Solutions:**

1. Check route pattern syntax - use `/api/*` not `/api/**`
2. Verify HTTP method matches - strings default to GET
3. Check condition order - all conditions must pass
4. Use function matcher to debug: `req => { console.log(req.path); return true }`

### Parameters Not Extracted

**Problem:** `req.params` is empty

**Solution:** Enable `updateParams: true` in endpoint config:

```js
middleware.iff({
  endpoints: [
    {
      url: "/tasks/:id",
      updateParams: true, // Required to extract params
    },
  ],
});
```

### Version Matching Not Working

**Problem:** Version-based routing doesn't match

**Solutions:**

1. Verify `Accept-Version` header is sent by client
2. Check semver format - use `2.0.0` or `2.x` format
3. Ensure version is in endpoint config

---

## Support & Contributing

### Report Issues

- GitHub Issues: [middleware-if-unless/issues](https://github.com/jkyberneees/middleware-if-unless/issues)

### Support the Project

If this package helps you, consider supporting its maintenance:

- **PayPal:** https://www.paypal.me/kyberneees

---

## License

MIT © [21no.de](https://21no.de)
