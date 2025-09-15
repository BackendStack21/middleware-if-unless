/**
 * Represents a route endpoint configuration for middleware matching.
 */
export interface RouteEndpoint {
  /** HTTP methods to match. Defaults to ["GET"] if not specified. */
  methods?: string[];
  /** URL pattern to match against. Supports find-my-way route patterns. */
  url: string;
  /** Optional version constraint for the route. */
  version?: string;
  /** Whether to update req.params with matched route parameters. Defaults to false. */
  updateParams?: boolean;
}

/**
 * Configuration options for middleware execution conditions.
 */
export interface MiddlewareOptions {
  /** Array of endpoints (strings or RouteEndpoint objects) to match against. */
  endpoints?: (string | RouteEndpoint)[];
  /** Custom function to determine if middleware should execute. */
  custom?: (req: any) => boolean;
}

/**
 * Standard Express/Connect-style middleware function signature.
 * @param req - The request object
 * @param res - The response object
 * @param next - Function to call the next middleware in the chain
 */
export type MiddlewareFunction = (req: any, res: any, next: () => void) => void;

/**
 * Enhanced middleware function with conditional execution capabilities.
 * Extends the base middleware function with iff and unless methods.
 */
export interface ExtendedMiddleware extends MiddlewareFunction {
  /**
   * Execute middleware only if the specified condition is met.
   * @param options - Condition options: MiddlewareOptions object, custom function, or array of endpoints
   * @returns New ExtendedMiddleware instance with the condition applied
   */
  iff: (options: MiddlewareOptions | ((req: any) => boolean) | (string | RouteEndpoint)[]) => ExtendedMiddleware;

  /**
   * Execute middleware unless the specified condition is met.
   * @param options - Condition options: MiddlewareOptions object, custom function, or array of endpoints
   * @returns New ExtendedMiddleware instance with the condition applied
   */
  unless: (options: MiddlewareOptions | ((req: any) => boolean) | (string | RouteEndpoint)[]) => ExtendedMiddleware;
}

/**
 * Configuration options for the router instance.
 */
export interface RouterOptions {
  /** Default route handler function. */
  defaultRoute?: (req: any, res: any) => boolean;
  /** Additional router-specific options. */
  [key: string]: any;
}

/**
 * Factory function for creating router instances.
 * @param options - Optional router configuration
 * @returns Router instance
 */
export interface RouterFactory {
  (options?: RouterOptions): any;
}

/**
 * Main middleware enhancement function that adds iff/unless capabilities to middleware.
 *
 * @param routerOpts - Optional router configuration options
 * @param routerFactory - Optional router factory function (defaults to find-my-way)
 * @returns Function that takes a middleware and returns an ExtendedMiddleware with iff/unless methods
 *
 * @example
 * ```typescript
 * import iffUnless from 'middleware-if-unless';
 *
 * const iu = iffUnless();
 * const middleware = (req, res, next) => {
 *   console.log('Middleware executed');
 *   next();
 * };
 *
 * const enhanced = iu(middleware);
 *
 * // Execute only for specific routes
 * app.use(enhanced.iff(['/api/*']));
 *
 * // Execute unless specific routes match
 * app.use(enhanced.unless(['/public/*']));
 * ```
 */
export default function iffUnless(
  routerOpts?: RouterOptions,
  routerFactory?: RouterFactory
): (middleware: MiddlewareFunction) => ExtendedMiddleware;
