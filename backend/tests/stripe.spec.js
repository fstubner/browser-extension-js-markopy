import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StripeService } from '../backend/services/stripeService.js';

// Mock Stripe and DB
const mockStripe = {
  webhooks: {
    constructEvent: vi.fn(),
  },
  checkout: {
    sessions: {
      create: vi.fn(),
    },
  },
};

const mockDb = {
  getLicenseByStripeSessionId: vi.fn(),
  generateLicenseKey: vi.fn(() => 'TEST-LICENSE-KEY'),
  storeLicense: vi.fn(),
};

describe('Stripe Integration', () => {
  let stripeService;

  beforeEach(() => {
    vi.clearAllMocks();
    stripeService = new StripeService(mockStripe, mockDb);
  });

  describe('Webhook Handling', () => {
    it('should handle checkout.session.completed event', async () => {
      const payload = {
        id: 'evt_test_123',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_session_123',
            customer: 'cus_test_123',
            created: 1234567890,
            metadata: { userId: 'user_123' },
            customer_email: 'test@example.com',
            amount_total: 499,
          },
        },
      };

      // Mock signature verification success
      mockStripe.webhooks.constructEvent.mockReturnValue(payload);

      // Mock DB: Session not processed yet
      mockDb.getLicenseByStripeSessionId.mockResolvedValue(null);

      await stripeService.handleWebhook(
        Buffer.from(JSON.stringify(payload)),
        'test_signature',
        'test_secret'
      );

      // Verify license creation
      expect(mockDb.storeLicense).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'user_123',
        licenseKey: 'TEST-LICENSE-KEY',
        stripeSessionId: 'cs_test_session_123',
        isActive: true,
        licenseType: 'premium',
      }));
    });

    it('should ignore duplicate webhooks', async () => {
      const payload = {
        type: 'checkout.session.completed',
        data: { object: { id: 'cs_test_session_123' } },
      };

      mockStripe.webhooks.constructEvent.mockReturnValue(payload);
      // Mock DB: Session ALREADY processed
      mockDb.getLicenseByStripeSessionId.mockResolvedValue({ licenseKey: 'EXISTING' });

      await stripeService.handleWebhook({}, 'sig', 'secret');

      expect(mockDb.storeLicense).not.toHaveBeenCalled();
    });

    it('should throw on invalid signature', async () => {
      mockStripe.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      await expect(stripeService.handleWebhook({}, 'bad_sig', 'secret'))
        .rejects.toThrow('Webhook signature verification failed');
    });
  });
});
