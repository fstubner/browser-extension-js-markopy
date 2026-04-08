import express from 'express';
import crypto from 'crypto';

/**
 * Lemon Squeezy Webhook Handler
 *
 * Verifies the X-Signature header and processes 'order_created' events to
 * record entitlements in the database.
 */
export function registerWebhookRoutes(app, { db }) {
  const router = express.Router();

  router.post('/webhooks/lemonsqueezy', async (req, res) => {
    try {
      // 1. Verify Signature
      const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
      const signature = req.get('X-Signature');

      if (!secret || !signature) {
        return res.status(401).json({ error: 'Missing signature or secret' });
      }

      // If body is already parsed by json middleware (it shouldn't be due to app.js config),
      // we need the raw body.
      // Assumption: app.js is configured to PASS raw body or we access it differently.
      // However, usually we need `express.raw({type: 'application/json'})` middleware for this route
      // OR rely on the fact that we skipped the global json parser.
      // Let's assume we need to parse it here as raw buffer if not already done.

      // Ideally, we'd handle the buffering middleware here if we skipped the global one.
      // But for simplicity, we'll assume req can be read or we use a localized body parser.

      // Since we skipped global jsonParser for this path in app.js, we need to read it.
    } catch (err) {
      console.error('Webhook Error:', err);
      // Lemon Squeezy expects 200 OK even on failure to prevent retries if it's a logic error,
      // but 500 triggers retries.
      return res.status(500).json({ error: 'Webhook processing failed' });
    }
  });

  // We need to implement the actual logic:
  // Since we skipped middleware in app.js, we must handle body parsing explicitly here.

  // Re-define routes with middleware
  app.post('/api/webhooks/lemonsqueezy',
    express.raw({ type: 'application/json' }),
    async (req, res) => {
      try {
        const rawBody = req.body;
        const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
        const signature = req.get('X-Signature');

        if (!secret) {
           console.error('LEMONSQUEEZY_WEBHOOK_SECRET not set');
           return res.status(500).json({ error: 'Server configuration error' });
        }

        const hmac = crypto.createHmac('sha256', secret);
        const digest = hmac.update(rawBody).digest('hex');

        if (!crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature || ''))) {
          return res.status(401).json({ error: 'Invalid signature' });
        }

        // Parse JSON
        const payload = JSON.parse(rawBody.toString('utf8'));
        const eventName = payload.meta.event_name;

        console.log(`Received Lemon Squeezy event: ${eventName}`);

        if (eventName === 'order_created' || eventName === 'order_paid') {
            const { attributes } = payload.data;
            const { user_email, custom_data } = attributes;
            // custom_data keys are lowercase in LS payload usually
            const userId = custom_data?.user_id || custom_data?.userId;

            if (user_email) {
                // Upsert entitlement
                // status: 'active' (lifetime)
                await db.saveEntitlement({
                    userId,
                    email: user_email,
                    source: 'lemonsqueezy',
                    status: 'active',
                    purchasedAt: attributes.created_at,
                    orderId: payload.data.id
                });
                console.log(`Entitlement activated for ${user_email}`);
            }
        }

        res.json({ received: true });
      } catch (err) {
        console.error('Webhook processing failed:', err);
        res.status(500).json({ error: 'Internal Server Error' });
      }
    }
  );
}
