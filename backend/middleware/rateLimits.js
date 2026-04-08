import rateLimit from 'express-rate-limit';

/**
 * Strict rate limiter for license activation endpoint
 * Prevents brute-force license key guessing
 */
export const activateLicenseLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per 15 minutes per IP
  message: 'Too many license activation attempts. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false, // Count all attempts
});

/**
 * Very strict rate limiter for admin endpoints
 * Prevents brute-force admin key guessing
 */
export const adminEndpointLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Only 5 attempts per hour per IP
  message: 'Too many admin requests. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
});

/**
 * Moderate rate limiter for license checking
 * Allows normal usage but prevents abuse
 */
export const checkLicenseLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: process.env.NODE_ENV === 'production' ? 20 : 100, // Higher limit for development
  message: 'Too many license check requests. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Only count failed requests
});
