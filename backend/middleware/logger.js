/**
 * Simple request logger middleware with request-id support.
 */
export function loggerMiddleware(req, res, next) {
  // Avoid noisy logs during automated tests
  const isTestEnv = process.env.NODE_ENV === 'test' || Boolean(process.env.VITEST);
  if (isTestEnv) return next();

  const start = Date.now();

  res.on('finish', () => {
    const durationMs = Date.now() - start;
    const requestId = req.id || 'unknown';
    const path = req.originalUrl || req.path || '';
    const entry = {
      level: 'info',
      msg: 'request',
      requestId,
      method: req.method,
      path,
      status: res.statusCode,
      durationMs,
    };
    console.log(JSON.stringify(entry));
  });

  next();
}
