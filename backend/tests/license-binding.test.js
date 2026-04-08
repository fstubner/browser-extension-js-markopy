import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import express from 'express';
import * as db from '../db.js';
import { registerLicenseRoutes } from '../routes/license.js';

function createLicenseTestApp() {
  const app = express();
  app.use(express.json({ limit: '10kb' }));
  registerLicenseRoutes(app, { db });
  return app;
}

describe('License binding (one-person-per-key)', () => {
  let app;

  beforeEach(() => {
    // Ensure in-memory DB for these tests (no Supabase env configured in CI).
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_KEY;
    delete process.env.SUPABASE_ANON_KEY;

    process.env.ADMIN_KEY = 'test-admin-key';

    db.initDatabase();
    app = createLicenseTestApp();
  });

  it('binds an unclaimed key to the first userId that activates it', async () => {
    const licenseKey = `MKPY-${'A'.repeat(32)}`;
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);

    await db.storeLicense({
      userId: null,
      licenseKey,
      purchasedAt: new Date(),
      expiresAt: future,
      isActive: true,
      isFree: true,
    });

    const userId = 'user-1';

    const resp = await request(app)
      .post('/api/activate-license')
      .send({ userId, licenseKey })
      .expect(200);

    expect(resp.body.isPremium).toBe(true);
    expect(resp.body.licenseKey).toBe(licenseKey);

    // After activation, the user should be premium even without providing the key.
    const check = await request(app)
      .post('/api/check-license')
      .send({ userId })
      .expect(200);
    expect(check.body.isPremium).toBe(true);
  });

  it('rejects activation if the key is already bound to a different userId', async () => {
    const licenseKey = `MKPY-${'B'.repeat(32)}`;
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);

    // Store as unbound first.
    await db.storeLicense({
      userId: null,
      licenseKey,
      purchasedAt: new Date(),
      expiresAt: future,
      isActive: true,
      isFree: true,
    });

    // First activation claims it.
    await request(app)
      .post('/api/activate-license')
      .send({ userId: 'user-1', licenseKey })
      .expect(200);

    // Second activation from another user must fail.
    const resp = await request(app)
      .post('/api/activate-license')
      .send({ userId: 'user-2', licenseKey })
      .expect(409);

    expect(resp.body.code).toBe('LICENSE_ALREADY_CLAIMED');
  });

  it("doesn't allow checking someone else's key for a different userId", async () => {
    const licenseKey = `MKPY-${'C'.repeat(32)}`;
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);

    // Create and claim license for user-1
    await db.storeLicense({
      userId: null,
      licenseKey,
      purchasedAt: new Date(),
      expiresAt: future,
      isActive: true,
      isFree: true,
    });
    await request(app)
      .post('/api/activate-license')
      .send({ userId: 'user-1', licenseKey })
      .expect(200);

    // user-2 should not be premium even if they present user-1's key
    const resp = await request(app)
      .post('/api/check-license')
      .send({ userId: 'user-2', licenseKey })
      .expect(200);

    expect(resp.body.isPremium).toBe(false);
  });

  it('generates free licenses as unbound keys (claimed on first activation)', async () => {
    const resp = await request(app)
      .post('/api/generate-free-license')
      .send({ adminKey: process.env.ADMIN_KEY, email: 'tester@example.com' })
      .expect(200);

    expect(resp.body.success).toBe(true);
    expect(resp.body.licenseKey).toMatch(/^MKPY-[A-F0-9]{32}$/);

    const license = await db.getLicense(null, resp.body.licenseKey);
    expect(license).toBeTruthy();
    expect(license.userId).toBe(null);
  });
});
