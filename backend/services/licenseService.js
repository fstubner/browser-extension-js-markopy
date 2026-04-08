import { AppError } from '../utils/errors.js';
import { logLicenseEvent } from '../utils/auditLog.js';
import crypto from 'crypto';

export class LicenseService {
  constructor(db) {
    this.db = db;
  }

  async activateTrial(userId, ip, requestId) {
    // Check if user already has an active premium license
    const existing = await this.db.getLicense(userId, null);
    if (existing && existing.licenseType === 'premium') {
      logLicenseEvent({
        operation: 'activate_trial',
        userId,
        licenseKey: null,
        result: 'failure',
        ip,
        requestId,
        metadata: { reason: 'already_premium' }
      });
      return { success: false, error: 'You already have premium access', isPremium: true };
    }

    // Check if user already used their trial
    const hasUsed = await this.db.hasUsedTrial(userId);
    if (hasUsed) {
      logLicenseEvent({
        operation: 'activate_trial',
        userId,
        licenseKey: null,
        result: 'failure',
        ip,
        requestId,
        metadata: { reason: 'trial_already_used' }
      });
      return {
        success: false,
        error: 'Trial already used. Upgrade to Premium for continued access.',
        trialUsed: true,
      };
    }

    // Create trial license
    const trial = await this.db.createTrialLicense(userId);
    if (!trial) {
      logLicenseEvent({
        operation: 'activate_trial',
        userId,
        licenseKey: null,
        result: 'error',
        ip,
        requestId,
        metadata: { error: 'Failed to create trial' }
      });
      throw new AppError('Failed to create trial. Please try again.', 'TRIAL_CREATION_FAILED', 500);
    }

    // Success
    logLicenseEvent({
      operation: 'activate_trial',
      userId,
      licenseKey: trial.licenseKey,
      result: 'success',
      ip,
      requestId,
      metadata: { expiresAt: trial.expiresAt }
    });

    return {
      success: true,
      isPremium: true,
      licenseKey: trial.licenseKey,
      licenseType: 'trial',
      expiresAt: trial.expiresAt?.getTime(),
      trialStartedAt: trial.trialStartedAt?.getTime(),
      daysRemaining: 7,
    };
  }

  async generateFreeLicense(adminKey, providedAdminKey, ip, requestId) {
    const expectedAdminKey = adminKey?.trim();
    if (!expectedAdminKey) {
      throw new AppError('ADMIN_KEY not configured', 'CONFIG_ERROR', 503);
    }

    const provided = typeof providedAdminKey === 'string' ? providedAdminKey : '';
    const expectedBuf = Buffer.from(expectedAdminKey);
    const providedBuf = Buffer.from(provided);
    const isMatch =
      providedBuf.length === expectedBuf.length && crypto.timingSafeEqual(providedBuf, expectedBuf);

    if (!isMatch) {
      logLicenseEvent({
        operation: 'generate_free',
        userId: null,
        licenseKey: null,
        result: 'failure',
        ip,
        requestId,
        metadata: { reason: 'invalid_admin_key' }
      });
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const licenseKey = this.db.generateLicenseKey();
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 100);

    const license = {
      userId: null,
      licenseKey,
      licenseType: 'premium',
      purchasedAt: new Date(),
      expiresAt,
      isActive: true,
      isFree: true,
    };

    await this.db.storeLicense(license);

    return {
      success: true,
      licenseKey,
      message: 'Free license generated successfully',
    };
  }

  async checkLicense(userId, licenseKey) {
    try {
      const license =
        (licenseKey ? await this.db.getLicense(userId, licenseKey) : null) ||
        (await this.db.getLicense(userId, null));

      if (!license) return { isPremium: false };
      if (license.expiresAt && new Date(license.expiresAt) < new Date()) return { isPremium: false };
      if (!license.isActive) return { isPremium: false };

      let daysRemaining = null;
      if (license.licenseType === 'trial' && license.expiresAt) {
        const now = new Date();
        const msRemaining = license.expiresAt.getTime() - now.getTime();
        daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));
      }

      return {
        isPremium: true,
        licenseKey: license.licenseKey,
        licenseType: license.licenseType || 'premium',
        purchasedAt: license.purchasedAt?.getTime(),
        expiresAt: license.expiresAt?.getTime(),
        trialStartedAt: license.trialStartedAt?.getTime() || null,
        daysRemaining,
      };
    } catch (error) {
      throw new AppError('Failed to check license', 'LICENSE_CHECK_FAILED', 500, false);
    }
  }

  async activateLicense(userId, licenseKey, ip, requestId) {
    const license = await this.db.getLicense(null, licenseKey);

    if (!license) {
      logLicenseEvent({
        operation: 'activate',
        userId,
        licenseKey,
        result: 'failure',
        ip,
        requestId,
        metadata: { reason: 'invalid_key' }
      });
      throw new AppError('Invalid license key', 'LICENSE_NOT_FOUND', 404, true);
    }

    if (license.expiresAt && new Date(license.expiresAt) < new Date()) {
      logLicenseEvent({
        operation: 'activate',
        userId,
        licenseKey,
        result: 'failure',
        ip,
        requestId,
        metadata: { reason: 'expired' }
      });
      throw new AppError('License expired', 'LICENSE_EXPIRED', 400, true);
    }

    if (!license.isActive) {
      logLicenseEvent({
        operation: 'activate',
        userId,
        licenseKey,
        result: 'failure',
        ip,
        requestId,
        metadata: { reason: 'inactive' }
      });
      throw new AppError('License is not active', 'LICENSE_INACTIVE', 400, true);
    }

    if (license.userId) {
      if (license.userId !== userId) {
        logLicenseEvent({
          operation: 'activate',
          userId,
          licenseKey,
          result: 'failure',
          ip,
          requestId,
          metadata: { reason: 'already_claimed' }
        });
        throw new AppError(
          'License key already activated by another user',
          'LICENSE_ALREADY_CLAIMED',
          409,
          true
        );
      }
    } else {
      const bound = await this.db.bindLicenseToUser(licenseKey, userId);
      if (!bound) {
        logLicenseEvent({
          operation: 'activate',
          userId,
          licenseKey,
          result: 'failure',
          ip,
          requestId,
          metadata: { reason: 'race_condition' }
        });
        throw new AppError(
          'License key was just activated by another user',
          'LICENSE_RACE_CONDITION',
          409,
          true
        );
      }
    }

    logLicenseEvent({
      operation: 'activate',
      userId,
      licenseKey,
      result: 'success',
      ip,
      requestId,
      metadata: {}
    });

    return {
      isPremium: true,
      licenseKey: license.licenseKey,
      purchasedAt: license.purchasedAt?.getTime(),
      expiresAt: license.expiresAt?.getTime(),
    };
  }
}