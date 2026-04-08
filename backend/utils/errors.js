/**
 * Error handling utilities
 */

/**
 * Application error class
 */
export class AppError extends Error {
  constructor(
    message,
    code,
    statusCode = 500,
    isOperational = true
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Handle errors and send appropriate response
 */
export function handleError(error, req, res) {
  // Log full error for debugging
  const requestId = req.id || 'unknown';
  console.error(`[${requestId}] Error:`, error);

  // Determine if error is operational (expected) or programming error
  if (error instanceof AppError && error.isOperational) {
    return res.status(error.statusCode).json({
      error: error.message,
      code: error.code,
      requestId,
    });
  }

  // Don't expose internal errors
  return res.status(500).json({
    error: 'An internal error occurred',
    code: 'INTERNAL_ERROR',
    requestId,
  });
}

/**
 * Async handler wrapper to catch errors
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
      handleError(error, req, res);
    });
  };
}
