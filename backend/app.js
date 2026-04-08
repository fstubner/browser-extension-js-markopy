import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { requestIdMiddleware } from './middleware/requestId.js';
import { loggerMiddleware } from './middleware/logger.js';
import { handleError } from './utils/errors.js';
import { registerRoutes } from './routes/index.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function createApp({ stripe, db }) {
  const app = express();
  const __dirname = path.dirname(fileURLToPath(import.meta.url));

  // Vercel/other deployments typically sit behind a proxy.
  // This ensures req.ip is correct and rate limiting behaves as intended.
  app.set('trust proxy', 1);

  // Request ID + logging (early so every response is traceable)
  app.use(requestIdMiddleware);
  app.use(loggerMiddleware);

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      // Lemon Squeezy retries webhooks; don't rate-limit them.
      if (req.originalUrl?.startsWith('/api/webhooks/lemonsqueezy')) return true;
      // Health checks should remain lightweight and reliable.
      if (req.originalUrl?.startsWith('/api/health')) return true;
      return false;
    },
  });

  // Apply rate limiting to API routes
  app.use('/api/', limiter);

  // Static assets for simple HTML pages
  app.use('/public', express.static(path.join(__dirname, 'public'), {
    fallthrough: false,
    maxAge: '1h',
    setHeaders: (res) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Referrer-Policy', 'no-referrer');
      res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    },
  }));

  // CORS: Allow extension origin and configured origins
  const rawAllowedOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  const allowAllOrigins = rawAllowedOrigins.includes('*');
  const allowedOrigins = rawAllowedOrigins.filter(o => o !== '*');
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction && (allowAllOrigins || allowedOrigins.length === 0)) {
    throw new Error('In production, set ALLOWED_ORIGINS to a comma-separated list of allowed origins (no "*").');
  }

  // Apply CORS only to browser-facing API routes.
  // Webhooks (and other server-to-server calls) typically have no Origin header.
  const corsMiddleware = cors({
    origin: (origin, callback) => {
      if (allowAllOrigins) return callback(null, true);

      // In production, reject requests without Origin for browser-facing endpoints.
      // (Non-browser endpoints skip this middleware entirely; see below.)
      if (isProduction && !origin) return callback(new Error('Not allowed by CORS'));

      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: false,
  });

  app.use((req, res, next) => {
    if (req.originalUrl?.startsWith('/api/webhooks/lemonsqueezy')) return next();
    if (req.originalUrl?.startsWith('/api/health')) return next();
    return corsMiddleware(req, res, next);
  });

  // Body parsing:
  // - Webhooks need request signing verification (often requires raw body)
  // - other endpoints expect JSON
  const jsonParser = express.json({ limit: '10kb' });
  app.use((req, res, next) => {
    // Lemon Squeezy webhooks also need verification, typically raw body
    if (req.originalUrl?.startsWith('/api/webhooks/lemonsqueezy')) return next();
    return jsonParser(req, res, next);
  });

  registerRoutes(app, { db }); // Stripe dependency removed

  // Catch-all error handler for sync errors
  // (async routes should use asyncHandler, which calls handleError)
  app.use((err, req, res, _next) => {
    handleError(err, req, res);
  });

  return app;
}
