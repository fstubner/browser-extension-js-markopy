import { validateLicenseKey, validateUserId } from '../middleware/validation.js';
import { AppError, asyncHandler } from '../utils/errors.js';
import { activateLicenseLimiter, adminEndpointLimiter, checkLicenseLimiter } from '../middleware/rateLimits.js';
import { LicenseService } from '../services/licenseService.js';
import { createClient } from '@supabase/supabase-js';

function getBearerToken(authorizationHeader) {
  if (typeof authorizationHeader !== 'string') return '';
  const match = authorizationHeader.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || '';
}

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !serviceKey) {
    throw new AppError('Supabase not configured on backend', 'SUPABASE_NOT_CONFIGURED', 503, false);
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export function registerLicenseRoutes(app, { db }) {
  const licenseService = new LicenseService(db);

  // Start 7-day premium trial
  app.post(
    '/api/activate-trial',
    checkLicenseLimiter,
    validateUserId,
    asyncHandler(async (req, res) => {
      const result = await licenseService.activateTrial(
        req.body.userId,
        req.ip || req.connection?.remoteAddress,
        req.id
      );
      if (!result.success) {
        return res.json(result);
      }
      res.json(result);
    })
  );

  // Generate free license (for family/friends - requires admin key)
  app.post(
    '/api/generate-free-license',
    adminEndpointLimiter,
    asyncHandler(async (req, res) => {
      const bodyAdminKey = typeof req.body?.adminKey === 'string' ? req.body.adminKey.trim() : '';
      const headerAdminKey = getBearerToken(req.headers.authorization);
      const providedAdminKey = headerAdminKey || bodyAdminKey;

      const result = await licenseService.generateFreeLicense(
        process.env.ADMIN_KEY,
        providedAdminKey,
        req.ip || req.connection?.remoteAddress,
        req.id
      );
      res.json(result);
    })
  );

  // Check license status
  app.post(
    '/api/check-license',
    checkLicenseLimiter,
    validateUserId,
    asyncHandler(async (req, res) => {
      const result = await licenseService.checkLicense(req.body.userId, req.body.licenseKey);
      res.json(result);
    })
  );

  // Activate license
  app.post(
    '/api/activate-license',
    activateLicenseLimiter,
    validateLicenseKey,
    validateUserId,
    asyncHandler(async (req, res) => {
      const result = await licenseService.activateLicense(
        req.body.userId,
        req.body.licenseKey,
        req.ip || req.connection?.remoteAddress,
        req.id
      );
      res.json(result);
    })
  );

  // Restore purchase (opaque): user signs in via Supabase OTP, extension sends Supabase access token.
  // Backend verifies the token, extracts the verified email, finds the latest paid license for that email,
  // and binds it to the signed-in userId (sb_<supabaseUserId>).
  app.post(
    '/api/claim-license',
    checkLicenseLimiter,
    validateUserId,
    asyncHandler(async (req, res) => {
      const jwt = getBearerToken(req.headers.authorization);
      if (!jwt) {
        throw new AppError('Missing authorization token', 'UNAUTHORIZED', 401, true);
      }

      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase.auth.getUser(jwt);
      if (error) {
        throw new AppError('Invalid authorization token', 'UNAUTHORIZED', 401, true);
      }

      const user = data?.user;
      const supabaseUserId = user?.id;
      const email = user?.email;
      if (!supabaseUserId || !email) {
        throw new AppError('Unable to verify user identity', 'UNAUTHORIZED', 401, true);
      }

      const expectedUserId = `sb_${supabaseUserId}`;
      if (req.body.userId !== expectedUserId) {
        throw new AppError('User mismatch', 'USER_MISMATCH', 400, true);
      }

      const license = await db.getLatestPaidLicenseByCustomerEmail(String(email).trim().toLowerCase());
      if (!license) {
        return res.status(404).json({
          success: false,
          error: 'No paid purchase found for this email. If you purchased with a different email, try signing in with that email or use your license key.',
        });
      }

      if (license.userId && license.userId !== expectedUserId) {
        throw new AppError(
          'This purchase is already linked to a different account. Please contact support.',
          'LICENSE_ALREADY_CLAIMED',
          409,
          true
        );
      }

      if (!license.userId) {
        const bound = await db.bindLicenseToUser(license.licenseKey, expectedUserId);
        if (!bound) {
          throw new AppError(
            'This purchase was just claimed by another account. Please contact support.',
            'LICENSE_RACE_CONDITION',
            409,
            true
          );
        }
      }

      // Return a familiar shape consistent with check-license/activate-license consumers
      return res.json({
        success: true,
        isPremium: true,
        licenseKey: license.licenseKey,
        licenseType: license.licenseType || 'premium',
        purchasedAt: license.purchasedAt?.getTime?.() ?? null,
        expiresAt: license.expiresAt?.getTime?.() ?? null,
      });
    })
  );
}
