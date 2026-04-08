import { randomBytes } from 'crypto';

/**
 * Assign a request ID to each request for tracing and support.
 * - Uses incoming X-Request-ID when provided (sanitized)
 * - Otherwise generates a new one
 */
export function requestIdMiddleware(req, res, next) {
  const incoming = req.headers?.['x-request-id'];
  const requestId =
    typeof incoming === 'string' && incoming.trim()
      ? incoming.trim().slice(0, 200)
      : `req_${randomBytes(8).toString('hex')}`;

  req.id = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
}
