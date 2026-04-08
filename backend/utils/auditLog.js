/**
 * Audit logging for license operations
 * Logs security-relevant events for monitoring and investigation
 */

/**
 * Log a license-related event
 * @param {Object} params - Event parameters
 * @param {string} params.operation - Operation type (activate, check, generate, etc.)
 * @param {string} params.userId - User ID (or null)
 * @param {string} params.licenseKey - License key (or null)
 * @param {string} params.result - Result (success, failure, error)
 * @param {string} params.ip - Client IP address
 * @param {string} params.requestId - Request ID for tracing
 * @param {Object} params.metadata - Additional metadata (error messages, etc.)
 */
export function logLicenseEvent({
  operation,
  userId = null,
  licenseKey = null,
  result,
  ip = null,
  requestId = null,
  metadata = {}
}) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    operation,
    userId: userId ? maskUserId(userId) : null,
    licenseKey: licenseKey ? maskLicenseKey(licenseKey) : null,
    result,
    ip: ip ? maskIp(ip) : null,
    requestId,
    metadata,
  };

  // In production, this should write to a proper logging service
  // (e.g., CloudWatch, Datadog, file-based log aggregation)
  console.log('[AUDIT]', JSON.stringify(logEntry));
}

/**
 * Mask user ID for privacy (show first 8 chars + asterisks)
 */
function maskUserId(userId) {
  if (!userId || userId.length <= 8) return '****';
  return userId.substring(0, 8) + '****';
}

/**
 * Mask license key (show prefix + last 4 chars)
 */
function maskLicenseKey(key) {
  if (!key || key.length <= 10) return 'MKPY-****';
  return key.substring(0, 9) + '****' + key.substring(key.length - 4);
}

/**
 * Mask IP address (show first 2 octets for IPv4)
 */
function maskIp(ip) {
  if (!ip) return null;
  const parts = ip.split('.');
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.*.*`;
  }
  // For IPv6 or other formats, just mask heavily
  return ip.substring(0, Math.min(ip.length, 8)) + '****';
}
