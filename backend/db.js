// Database abstraction layer - supports both in-memory (dev) and Supabase (production)
import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';

let db = null;
let useSupabase = false;

// Initialize database
export function initDatabase() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

  // Production safety: only use the Service Role key for license storage.
  // The anon key is exposed to the client (extension) for Supabase Auth and MUST NOT be used here.
  if (supabaseUrl && supabaseServiceKey) {
    db = createClient(supabaseUrl, supabaseServiceKey);
    useSupabase = true;
    console.log('Using Supabase database');
  } else {
    // Fallback to in-memory for development
    db = new Map();
    useSupabase = false;
    console.log('Using in-memory database (set SUPABASE_URL and SUPABASE_SERVICE_KEY for persistent storage)');
  }
}

/**
 * Lightweight dependency health check.
 * - For Supabase: attempt a simple read on licenses.
 * - For in-memory: always ok.
 */
export async function checkHealth() {
  if (!useSupabase) {
    return { ok: true, provider: 'memory' };
  }
  try {
    const { error } = await db.from('licenses').select('license_key').limit(1);
    if (error) {
      return { ok: false, provider: 'supabase', error: error.message || String(error) };
    }
    return { ok: true, provider: 'supabase' };
  } catch (e) {
    return { ok: false, provider: 'supabase', error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

// Generate license key
export function generateLicenseKey() {
  return 'MKPY-' + randomBytes(16).toString('hex').toUpperCase();
}

// Store license
export async function storeLicense(licenseData) {
  if (useSupabase) {
    const { data, error } = await db
      .from('licenses')
      .upsert({
        license_key: licenseData.licenseKey,
        user_id: licenseData.userId || null,
        license_type: licenseData.licenseType || 'premium',
        stripe_session_id: licenseData.stripeSessionId || null,
        stripe_customer_id: licenseData.stripeCustomerId || null,
        stripe_customer_email: licenseData.stripeCustomerEmail || null,
        purchased_at: licenseData.purchasedAt?.toISOString() || new Date().toISOString(),
        expires_at: licenseData.expiresAt?.toISOString() || null,
        trial_started_at: licenseData.trialStartedAt?.toISOString() || null,
        is_active: licenseData.isActive !== false,
        is_free: licenseData.isFree || false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'license_key'
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    return {
      licenseKey: data.license_key,
      userId: data.user_id,
      licenseType: data.license_type,
      purchasedAt: new Date(data.purchased_at),
      expiresAt: data.expires_at ? new Date(data.expires_at) : null,
      trialStartedAt: data.trial_started_at ? new Date(data.trial_started_at) : null,
      isActive: data.is_active,
      isFree: data.is_free,
    };
  } else {
    // In-memory storage
    const key = licenseData.licenseKey || licenseData.userId;
    db.set(key, {
      ...licenseData,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return licenseData;
  }
}

// Get license
export async function getLicense(userId, licenseKey) {
  if (useSupabase) {
    let query = db.from('licenses').select('*');

    // Ownership enforcement:
    // - If both userId + licenseKey are provided, require that the key belongs to that user.
    //   This prevents checking someone else's key by guessing/leaking it.
    if (licenseKey && userId) {
      query = query.eq('license_key', licenseKey).eq('user_id', userId);
    } else if (licenseKey) {
      query = query.eq('license_key', licenseKey);
    } else if (userId) {
      query = query.eq('user_id', userId).eq('is_active', true);
    } else {
      return null;
    }

    const { data, error } = await query.order('purchased_at', { ascending: false }).limit(1);

    if (error) {
      console.error('Supabase error:', error);
      return null;
    }

    if (!data || data.length === 0) {
      return null;
    }

    const license = data[0];
    return {
      licenseKey: license.license_key,
      userId: license.user_id,
      licenseType: license.license_type || 'premium',
      stripeSessionId: license.stripe_session_id,
      stripeCustomerId: license.stripe_customer_id,
      purchasedAt: new Date(license.purchased_at),
      expiresAt: license.expires_at ? new Date(license.expires_at) : null,
      trialStartedAt: license.trial_started_at ? new Date(license.trial_started_at) : null,
      isActive: license.is_active,
      isFree: license.is_free,
    };
  } else {
    // In-memory storage
    if (licenseKey) {
      const license = db.get(licenseKey) || null;
      if (!license) return null;

      // Enforce ownership if caller provided a userId.
      // Unbound keys (userId null) are not considered "valid" for a user until activation binds them.
      if (userId) {
        if (!license.userId) return null;
        if (license.userId !== userId) return null;
      }

      return license;
    }
    if (userId) {
      for (const [key, license] of db.entries()) {
        if (license.userId === userId && license.isActive) {
          return license;
        }
      }
    }
    return null;
  }
}

export async function getLicenseByStripeSessionId(stripeSessionId) {
  if (!stripeSessionId) return null;

  if (useSupabase) {
    const { data, error } = await db
      .from('licenses')
      .select('*')
      .eq('stripe_session_id', stripeSessionId)
      .order('purchased_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Supabase error:', error);
      return null;
    }

    if (!data || data.length === 0) {
      return null;
    }

    const license = data[0];
    return {
      licenseKey: license.license_key,
      userId: license.user_id,
      licenseType: license.license_type || 'premium',
      stripeSessionId: license.stripe_session_id,
      stripeCustomerId: license.stripe_customer_id,
      stripeCustomerEmail: license.stripe_customer_email,
      purchasedAt: new Date(license.purchased_at),
      expiresAt: license.expires_at ? new Date(license.expires_at) : null,
      trialStartedAt: license.trial_started_at ? new Date(license.trial_started_at) : null,
      isActive: license.is_active,
      isFree: license.is_free,
    };
  } else {
    for (const license of db.values()) {
      if (license?.stripeSessionId === stripeSessionId) {
        return license;
      }
    }
    return null;
  }
}

export async function getLatestPaidLicenseByCustomerEmail(email) {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized) return null;

  if (useSupabase) {
    const { data, error } = await db
      .from('licenses')
      .select('*')
      .eq('stripe_customer_email', normalized)
      .eq('license_type', 'premium')
      .eq('is_active', true)
      .order('purchased_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Supabase error:', error);
      return null;
    }
    if (!data || data.length === 0) return null;

    const license = data[0];
    return {
      licenseKey: license.license_key,
      userId: license.user_id,
      licenseType: license.license_type || 'premium',
      stripeSessionId: license.stripe_session_id,
      stripeCustomerId: license.stripe_customer_id,
      stripeCustomerEmail: license.stripe_customer_email,
      purchasedAt: new Date(license.purchased_at),
      expiresAt: license.expires_at ? new Date(license.expires_at) : null,
      trialStartedAt: license.trial_started_at ? new Date(license.trial_started_at) : null,
      isActive: license.is_active,
      isFree: license.is_free,
    };
  }

  // In-memory storage
  for (const license of db.values()) {
    const licEmail = String(license?.stripeCustomerEmail || '').trim().toLowerCase();
    if (
      licEmail &&
      licEmail === normalized &&
      (license.licenseType || 'premium') === 'premium' &&
      license.isActive
    ) {
      return license;
    }
  }
  return null;
}

// Get all licenses (for admin/free license generation)
export async function getAllLicenses(limit = 100) {
  if (useSupabase) {
    const { data, error } = await db
      .from('licenses')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Supabase error:', error);
      return [];
    }

    return data.map(license => ({
      licenseKey: license.license_key,
      userId: license.user_id,
      purchasedAt: new Date(license.purchased_at),
      isActive: license.is_active,
      isFree: license.is_free,
    }));
  } else {
    return Array.from(db.values()).slice(0, limit);
  }
}

/**
 * Atomically bind a license to a user (prevents race conditions)
 * Returns true if binding succeeded, false if already bound to different user
 */
export async function bindLicenseToUser(licenseKey, userId) {
  if (useSupabase) {
    // Atomic update: only set user_id if it's currently NULL
    const { data, error } = await db
      .from('licenses')
      .update({
        user_id: userId,
        updated_at: new Date().toISOString(),
      })
      .eq('license_key', licenseKey)
      .is('user_id', null) // Critical: only update if user_id is NULL
      .select()
      .single();

    if (error) {
      // If no rows matched (user_id was not null), this is expected
      if (error.code === 'PGRST116') {
        return false; // Already bound
      }
      console.error('Supabase error binding license:', error);
      throw error;
    }

    return !!data; // true if updated, false if no match
  } else {
    // In-memory storage - atomic check-and-set
    const license = db.get(licenseKey);
    if (!license) {
      throw new Error('License not found');
    }

    if (license.userId !== null) {
      return false; // Already bound
    }

    // Bind it
    license.userId = userId;
    license.updatedAt = new Date();
    db.set(licenseKey, license);
    return true;
  }
}

/**
 * Check if user has already used their trial
 * Returns true if user has a trial (active or expired), false otherwise
 */
export async function hasUsedTrial(userId) {
  if (!userId) return false;

  if (useSupabase) {
    const { data, error } = await db
      .from('licenses')
      .select('id')
      .eq('user_id', userId)
      .eq('license_type', 'trial')
      .limit(1);

    if (error) {
      console.error('Supabase error checking trial:', error);
      return false;
    }

    return data && data.length > 0;
  } else {
    // In-memory storage
    for (const license of db.values()) {
      if (license?.userId === userId && license?.licenseType === 'trial') {
        return true;
      }
    }
    return false;
  }
}

/**
 * Create a trial license for a user
 * Returns the created license or null if user already has a trial
 */
export async function createTrialLicense(userId) {
  // Check if user already used trial
  const alreadyUsed = await hasUsedTrial(userId);
  if (alreadyUsed) {
    return null;
  }

  const licenseKey = generateLicenseKey();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

  const license = {
    userId,
    licenseKey,
    licenseType: 'trial',
    purchasedAt: now,
    expiresAt,
    trialStartedAt: now,
    isActive: true,
    isFree: true,
  };

  return await storeLicense(license);
}

// --- Entitlement Helpers (MoR Support) ---

export async function saveEntitlement(entitlement) {
  // Map entitlement to license structure
  const licenseData = {
    licenseKey: entitlement.userId + '_ls_' + Date.now(), // Synthetic key if needed
    userId: entitlement.userId,
    licenseType: 'premium',
    purchasedAt: new Date(entitlement.purchasedAt),
    isActive: entitlement.status === 'active',
    extra_metadata: { source: entitlement.source, orderId: entitlement.orderId, email: entitlement.email }
  };

  // Reuse storeLicense logic roughly, but we might want to store email specifically
  // The existing storeLicense maps stripe bits. Let's customize or reusing storeLicense.
  // Actually, let's implement a direct upsert for entitlements to keep it clean if we can,
  // or reuse storeLicense and map 'stripe_customer_email' to our email for lookup.

  // Mapping to existing schema:
  // stripe_customer_email -> email
  // stripe_session_id -> orderId

  return storeLicense({
    ...licenseData,
    stripeCustomerEmail: entitlement.email,
    stripeSessionId: entitlement.orderId
  });
}

export async function getEntitlementByUserId(userId) {
  const license = await getLicense(userId);
  if (!license) return null;

  return {
    ...license,
    status: license.isActive ? 'active' : 'inactive',
    source: license.stripeSessionId ? 'lemonsqueezy' : 'manual' // rough heuristic
  };
}

export async function getEntitlementByEmail(email) {
  const license = await getLatestPaidLicenseByCustomerEmail(email);
  if (!license) return null;

  return {
    id: license.licenseKey, // map id to key for update logic
    status: license.isActive ? 'active' : 'inactive',
    purchasedAt: license.purchasedAt,
    userId: license.userId
  };
}

export async function updateEntitlementUserId(licenseKey, newUserId) {
  // Use existing bind logic, but we might need to overwrite if we are "restoring"
  // (i.e. moving from one user to another? Or just re-binding?).
  // bindLicenseToUser checks if null.
  // If we want to support "Move license to new device/user", we might need a force option.
  // For now, let's try bind (works if unbound).
  // If bound, maybe we clear and rebind?
  // Simple 'restore': just update the user_id.

  if (useSupabase) {
      const { data, error } = await db
        .from('licenses')
        .update({ user_id: newUserId, updated_at: new Date().toISOString() })
        .eq('license_key', licenseKey)
        .select();

      if (error) throw error;
      return true;
  } else {
      const license = db.get(licenseKey);
      if (license) {
          license.userId = newUserId;
          return true;
      }
      return false;
  }
}