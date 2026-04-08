import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';

// Mock Stripe
const mockStripe = {
  checkout: {
    sessions: {
      create: vi.fn(),
    },
  },
  webhooks: {
    constructEvent: vi.fn(),
  },
};

// Mock database
const mockDb = {
  storeLicense: vi.fn(),
  getLicense: vi.fn(),
  generateLicenseKey: vi.fn(() => 'TEST-LICENSE-KEY-123'),
  initDatabase: vi.fn(),
};

// Mock environment variables
process.env.STRIPE_SECRET_KEY = 'sk_test_mock';
process.env.BASE_URL = 'http://localhost:3000';
process.env.CURRENCY = 'eur';
process.env.ADMIN_KEY = 'test-admin-key';

// Create a test server
function createTestServer() {
  const app = express();
  app.use(express.json());
  app.use(express.raw({ type: 'application/json' }));

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Create checkout
  app.post('/api/create-checkout', async (req, res) => {
    try {
      const { userId } = req.body;
      const currency = process.env.CURRENCY || 'eur';
      const amount = 499;

      const session = await mockStripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: currency,
            product_data: {
              name: 'Markopy Premium',
              description: 'One-time purchase',
            },
            unit_amount: amount,
          },
          quantity: 1,
        }],
        mode: 'payment',
        success_url: `${process.env.BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}&userId=${encodeURIComponent(userId || '')}`,
        cancel_url: `${process.env.BASE_URL}/cancel`,
        metadata: {
          userId: userId || '',
        },
      });

      res.json({ url: session.url });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Check license
  app.post('/api/check-license', async (req, res) => {
    try {
      const { userId, licenseKey } = req.body;
      const license = await mockDb.getLicense(userId, licenseKey);

      if (!license) {
        return res.json({ isPremium: false });
      }

      if (license.expiresAt && new Date(license.expiresAt) < new Date()) {
        return res.json({ isPremium: false });
      }

      if (!license.isActive) {
        return res.json({ isPremium: false });
      }

      res.json({
        isPremium: true,
        licenseKey: license.licenseKey,
        purchasedAt: license.purchasedAt?.getTime(),
        expiresAt: license.expiresAt?.getTime(),
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Activate license
  app.post('/api/activate-license', async (req, res) => {
    try {
      const { userId, licenseKey } = req.body;

      if (!licenseKey) {
        return res.status(400).json({ error: 'License key required' });
      }

      const license = await mockDb.getLicense(null, licenseKey);

      if (!license) {
        return res.status(404).json({ error: 'Invalid license key' });
      }

      if (license.expiresAt && new Date(license.expiresAt) < new Date()) {
        return res.status(400).json({ error: 'License expired' });
      }

      if (!license.isActive) {
        return res.status(400).json({ error: 'License is not active' });
      }

      res.json({
        isPremium: true,
        licenseKey: license.licenseKey,
        purchasedAt: license.purchasedAt?.getTime(),
        expiresAt: license.expiresAt?.getTime(),
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Generate free license
  app.post('/api/generate-free-license', async (req, res) => {
    try {
      const { adminKey, email } = req.body;

      if (adminKey !== process.env.ADMIN_KEY) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const licenseKey = mockDb.generateLicenseKey();
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 100);

      const license = {
        userId: email || `free_${Date.now()}`,
        licenseKey,
        purchasedAt: new Date(),
        expiresAt,
        isActive: true,
        isFree: true,
      };

      await mockDb.storeLicense(license);

      res.json({
        success: true,
        licenseKey,
        message: 'Free license generated successfully',
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return app;
}

describe('Backend API Tests', () => {
  let app;

  beforeEach(() => {
    app = createTestServer();
    vi.clearAllMocks();
  });

  describe('Health Check', () => {
    it('should return ok status', async () => {
      const response = await request(app).get('/api/health');
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('Stripe Checkout', () => {
    it('should create checkout session', async () => {
      mockStripe.checkout.sessions.create.mockResolvedValueOnce({
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/test',
      });

      const response = await request(app)
        .post('/api/create-checkout')
        .send({ userId: 'test-user-123' })
        .expect(200);

      expect(response.body.url).toBe('https://checkout.stripe.com/test');
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'payment',
          metadata: expect.objectContaining({
            userId: 'test-user-123',
          }),
        })
      );
    });

    it('should handle checkout creation errors', async () => {
      mockStripe.checkout.sessions.create.mockRejectedValueOnce(
        new Error('Stripe error')
      );

      const response = await request(app)
        .post('/api/create-checkout')
        .send({ userId: 'test-user-123' })
        .expect(500);

      expect(response.body.error).toBe('Stripe error');
    });
  });

  describe('License Management', () => {
    it('should check license status - valid license', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 100);

      mockDb.getLicense.mockResolvedValueOnce({
        userId: 'test-user',
        licenseKey: 'TEST-KEY',
        isActive: true,
        expiresAt: futureDate,
        purchasedAt: new Date(),
      });

      const response = await request(app)
        .post('/api/check-license')
        .send({ userId: 'test-user', licenseKey: 'TEST-KEY' })
        .expect(200);

      expect(response.body.isPremium).toBe(true);
      expect(response.body.licenseKey).toBe('TEST-KEY');
    });

    it('should check license status - no license', async () => {
      mockDb.getLicense.mockResolvedValueOnce(null);

      const response = await request(app)
        .post('/api/check-license')
        .send({ userId: 'test-user', licenseKey: 'INVALID' })
        .expect(200);

      expect(response.body.isPremium).toBe(false);
    });

    it('should check license status - expired license', async () => {
      const pastDate = new Date();
      pastDate.setFullYear(pastDate.getFullYear() - 1);

      mockDb.getLicense.mockResolvedValueOnce({
        userId: 'test-user',
        licenseKey: 'TEST-KEY',
        isActive: true,
        expiresAt: pastDate,
      });

      const response = await request(app)
        .post('/api/check-license')
        .send({ userId: 'test-user', licenseKey: 'TEST-KEY' })
        .expect(200);

      expect(response.body.isPremium).toBe(false);
    });

    it('should activate valid license', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 100);

      mockDb.getLicense.mockResolvedValueOnce({
        userId: 'test-user',
        licenseKey: 'TEST-KEY',
        isActive: true,
        expiresAt: futureDate,
        purchasedAt: new Date(),
      });

      const response = await request(app)
        .post('/api/activate-license')
        .send({ userId: 'test-user', licenseKey: 'TEST-KEY' })
        .expect(200);

      expect(response.body.isPremium).toBe(true);
      expect(response.body.licenseKey).toBe('TEST-KEY');
    });

    it('should reject invalid license key', async () => {
      mockDb.getLicense.mockResolvedValueOnce(null);

      const response = await request(app)
        .post('/api/activate-license')
        .send({ userId: 'test-user', licenseKey: 'INVALID' })
        .expect(404);

      expect(response.body.error).toBe('Invalid license key');
    });

    it('should require license key', async () => {
      const response = await request(app)
        .post('/api/activate-license')
        .send({ userId: 'test-user' })
        .expect(400);

      expect(response.body.error).toBe('License key required');
    });
  });

  describe('Free License Generation', () => {
    it('should generate free license with admin key', async () => {
      mockDb.generateLicenseKey.mockReturnValueOnce('FREE-LICENSE-123');
      mockDb.storeLicense.mockResolvedValueOnce();

      const response = await request(app)
        .post('/api/generate-free-license')
        .send({ adminKey: 'test-admin-key', email: 'test@example.com' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.licenseKey).toBe('FREE-LICENSE-123');
      expect(mockDb.storeLicense).toHaveBeenCalled();
    });

    it('should reject without admin key', async () => {
      const response = await request(app)
        .post('/api/generate-free-license')
        .send({ email: 'test@example.com' })
        .expect(401);

      expect(response.body.error).toBe('Unauthorized');
    });

    it('should reject with wrong admin key', async () => {
      const response = await request(app)
        .post('/api/generate-free-license')
        .send({ adminKey: 'wrong-key', email: 'test@example.com' })
        .expect(401);

      expect(response.body.error).toBe('Unauthorized');
    });
  });
});
