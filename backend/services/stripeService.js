import { AppError } from '../utils/errors.js';

export class StripeService {
  constructor(stripe, db) {
    this.stripe = stripe;
    this.db = db;
  }

  async createCheckoutSession(userId, baseUrl) {
    if (!this.stripe) {
      throw new AppError('Stripe not configured', 'STRIPE_NOT_CONFIGURED', 503);
    }

    const currency = process.env.CURRENCY || 'eur';
    const amount = 499;

    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: currency,
            product_data: {
              name: 'Markopy Premium',
              description: 'One-time purchase - Advanced selector-based extraction features',
              images: [],
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${baseUrl || 'http://localhost:3000'}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl || 'http://localhost:3000'}/cancel`,
      metadata: {
        userId: userId || '',
      },
    });

    return { url: session.url };
  }

  async handleWebhook(body, signature, webhookSecret) {
    if (!this.stripe) {
      throw new AppError('Stripe not configured', 'STRIPE_NOT_CONFIGURED', 503);
    }

    let event;
    try {
      event = this.stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      throw new AppError(
        `Webhook signature verification failed: ${msg}`,
        'STRIPE_WEBHOOK_SIGNATURE_FAILED',
        400,
        true
      );
    }

    if (event.type === 'checkout.session.completed') {
      await this.handleCheckoutDefined(event.data.object);
    }

    return { received: true };
  }

  async handleCheckoutDefined(session) {
    const existing = await this.db.getLicenseByStripeSessionId(session.id);
    if (existing) {
      console.log(`Stripe webhook deduped for session ${session.id}`);
      return;
    }

    const licenseKey = this.db.generateLicenseKey();
    const userId = session.metadata?.userId?.trim() || null;
    if (!userId) {
      console.warn('Stripe checkout session missing metadata.userId - storing license as unbound');
    }

    const customerEmail =
      (session?.customer_details?.email && String(session.customer_details.email).trim().toLowerCase()) ||
      (session?.customer_email && String(session.customer_email).trim().toLowerCase()) ||
      null;

    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 100);

    const license = {
      userId,
      licenseKey,
      licenseType: 'premium',
      stripeSessionId: session.id,
      stripeCustomerId: session.customer,
      stripeCustomerEmail: customerEmail,
      purchasedAt: new Date(session.created * 1000),
      expiresAt,
      isActive: true,
      isFree: false,
    };

    try {
      await this.db.storeLicense(license);
    } catch (e) {
      const maybeExisting = await this.db.getLicenseByStripeSessionId(session.id);
      if (maybeExisting) {
        console.warn(`Stripe webhook duplicate for session ${session.id} (race)`);
        return;
      }
      throw e;
    }

    console.log(`License created: ${licenseKey} for user ${userId}`);
    await this.notifyDiscord(licenseKey, userId, session);
  }

  async notifyDiscord(licenseKey, userId, session) {
    if (!process.env.DISCORD_WEBHOOK_URL) return;

    try {
      await fetch(process.env.DISCORD_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embeds: [
            {
              title: '🎉 New Premium Purchase',
              description: 'Markopy Premium license purchased!',
              color: 0x10b981,
              fields: [
                { name: 'License Key', value: '`' + licenseKey + '`', inline: false },
                { name: 'User ID', value: userId || 'N/A', inline: true },
                { name: 'Customer Email', value: session.customer_email || 'N/A', inline: true },
                {
                  name: 'Amount',
                  value: session.amount_total
                    ? `${(session.amount_total / 100).toFixed(2)} ${String(session.currency || '').toUpperCase()}`
                    : 'N/A',
                  inline: true,
                },
              ],
              timestamp: new Date().toISOString(),
            },
          ],
        }),
      });
    } catch (discordError) {
      console.error('Discord webhook failed:', discordError);
    }
  }
}