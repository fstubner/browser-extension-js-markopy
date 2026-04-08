/**
 * REAL Stripe Integration Tests
 *
 * These tests make actual API calls to Stripe's test environment.
 *
 * Setup:
 * 1. Get Stripe test API key from https://dashboard.stripe.com/test/apikeys
 * 2. Set STRIPE_SECRET_KEY_TEST in your .env file (or export it)
 * 3. Run: STRIPE_SECRET_KEY_TEST=sk_test_... npm test -- integration.test.js
 *
 * Note: These tests require network access and will make real API calls to Stripe.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import Stripe from 'stripe';

// Use test key from environment, fallback to mock if not set
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY_TEST || process.env.STRIPE_SECRET_KEY;

// Skip all tests if no real Stripe key is provided
const shouldRunRealTests = STRIPE_SECRET_KEY && STRIPE_SECRET_KEY.startsWith('sk_test_');

const describeIf = shouldRunRealTests ? describe : describe.skip;

describeIf('Real Stripe Integration Tests', () => {
  let stripe;
  let testSessionId;

  beforeAll(() => {
    if (!shouldRunRealTests) {
      console.warn('WARNING Skipping real Stripe tests - set STRIPE_SECRET_KEY_TEST=sk_test_... to run');
      return;
    }
    stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: '2024-12-18.acacia',
    });
  });

  describe('Stripe Checkout Session Creation', () => {
    it('should create a real checkout session', async () => {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'eur',
            product_data: {
              name: 'Markopy Premium Test',
              description: 'Test purchase',
            },
            unit_amount: 499, // 4.99
          },
          quantity: 1,
        }],
        mode: 'payment',
        success_url: 'https://example.com/success',
        cancel_url: 'https://example.com/cancel',
        metadata: {
          userId: 'test-user-integration',
          test: 'true',
        },
      });

      expect(session).toBeDefined();
      expect(session.id).toMatch(/^cs_test_/);
      expect(session.url).toBeDefined();
      expect(session.metadata.userId).toBe('test-user-integration');
      expect(session.mode).toBe('payment');
      expect(session.amount_total).toBe(499);
      expect(session.currency).toBe('eur');

      // Store for cleanup
      testSessionId = session.id;
    });

    it('should create checkout session with correct currency (USD)', async () => {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Markopy Premium Test',
            },
            unit_amount: 499,
          },
          quantity: 1,
        }],
        mode: 'payment',
        success_url: 'https://example.com/success',
        cancel_url: 'https://example.com/cancel',
      });

      expect(session.currency).toBe('usd');
      expect(session.amount_total).toBe(499);
    });
  });

  describe('Stripe Webhook Event Construction', () => {
    it('should construct a webhook event from raw body', async () => {
      // Create a test checkout session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'eur',
            product_data: { name: 'Test' },
            unit_amount: 499,
          },
          quantity: 1,
        }],
        mode: 'payment',
        success_url: 'https://example.com/success',
        cancel_url: 'https://example.com/cancel',
      });

      // Simulate webhook payload (in real scenario, Stripe sends this)
      const payload = JSON.stringify({
        id: 'evt_test_webhook',
        type: 'checkout.session.completed',
        data: {
          object: session,
        },
      });

      // Get webhook secret from environment or use test secret
      // In production, this comes from Stripe Dashboard - Webhooks
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET_TEST;

      if (webhookSecret) {
        // Create signature (simplified - in real scenario Stripe provides this)
        const signature = stripe.webhooks.generateTestHeaderString({
          payload,
          secret: webhookSecret,
        });

        // Verify we can construct the event
        const event = stripe.webhooks.constructEvent(
          payload,
          signature,
          webhookSecret
        );

        expect(event.type).toBe('checkout.session.completed');
        expect(event.data.object.id).toBe(session.id);
      } else {
        console.warn('WARNING Skipping webhook test - STRIPE_WEBHOOK_SECRET_TEST not set');
      }
    });
  });

  describe('Stripe API Error Handling', () => {
    it('should handle invalid API key gracefully', async () => {
      const invalidStripe = new Stripe('sk_test_invalid_key', {
        apiVersion: '2024-12-18.acacia',
      });

      await expect(
        invalidStripe.checkout.sessions.create({
          payment_method_types: ['card'],
          line_items: [{
            price_data: {
              currency: 'eur',
              product_data: { name: 'Test' },
              unit_amount: 499,
            },
            quantity: 1,
          }],
          mode: 'payment',
          success_url: 'https://example.com/success',
          cancel_url: 'https://example.com/cancel',
        })
      ).rejects.toThrow();
    });

    it('should handle invalid request parameters', async () => {
      await expect(
        stripe.checkout.sessions.create({
          // Missing required fields
          mode: 'payment',
        })
      ).rejects.toThrow();
    });
  });

  describe('Stripe Session Retrieval', () => {
    it('should retrieve a checkout session by ID', async () => {
      // Create a session first
      const createdSession = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'eur',
            product_data: { name: 'Test' },
            unit_amount: 499,
          },
          quantity: 1,
        }],
        mode: 'payment',
        success_url: 'https://example.com/success',
        cancel_url: 'https://example.com/cancel',
      });

      // Retrieve it
      const retrievedSession = await stripe.checkout.sessions.retrieve(
        createdSession.id
      );

      expect(retrievedSession.id).toBe(createdSession.id);
      expect(retrievedSession.amount_total).toBe(499);
      expect(retrievedSession.currency).toBe('eur');
    });
  });
});
