/**
 * Validation middleware for API endpoints
 */

/**
 * Validate license key format
 */
export function validateLicenseKey(req, res, next) {
  const { licenseKey } = req.body;

  if (!licenseKey) {
    return res.status(400).json({ error: 'License key is required' });
  }

  if (typeof licenseKey !== 'string') {
    return res.status(400).json({ error: 'License key must be a string' });
  }

  if (!/^MKPY-[A-F0-9]{32}$/.test(licenseKey.trim())) {
    return res.status(400).json({ error: 'Invalid license key format' });
  }

  req.body.licenseKey = licenseKey.trim();
  next();
}

/**
 * Validate user ID format
 */
export function validateUserId(req, res, next) {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  if (typeof userId !== 'string') {
    return res.status(400).json({ error: 'User ID must be a string' });
  }

  if (userId.length > 200) {
    return res.status(400).json({ error: 'User ID is too long (max 200 characters)' });
  }

  // Basic sanitization
  req.body.userId = userId.trim().substring(0, 200);
  next();
}

/**
 * Validate email format (for free license generation)
 */
export function validateEmail(req, res, next) {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  if (typeof email !== 'string') {
    return res.status(400).json({ error: 'Email must be a string' });
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  req.body.email = email.trim().toLowerCase();
  next();
}
