# Local API Server Testing Guide

## Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Set Up Environment Variables

Create a `.env` file in the `backend/` directory:

```bash
cp .env.example .env
```

  Then edit `.env` and fill in your values:

```bash
# Stripe Keys (get from https://dashboard.stripe.com/test/apikeys)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...  # Required when STRIPE_SECRET_KEY is set

# Base URL for local development
BASE_URL=http://localhost:3000

# CORS (comma-separated list). For local dev you can set "*" to allow any origin.
# For the extension, include your extension origin (chrome://extensions -> Details -> ID):
#   chrome-extension://<YOUR_EXTENSION_ID>
ALLOWED_ORIGINS=*

# Currency (eur for Ireland/EU, usd for US)
CURRENCY=eur

# Supabase (optional - if not set, uses in-memory storage)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key

# Discord Webhook (optional)
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
```

**For local testing, you only need:**
- `STRIPE_SECRET_KEY` (use test key: `sk_test_...`)
- `BASE_URL=http://localhost:3000`

### 3. Start the Server

```bash
npm run dev
```

The server will start on `http://localhost:3000`

## Testing Endpoints

### 1. Health Check

```bash
curl http://localhost:3000/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-12-XX..."
}
```

### 2. Create Checkout Session

```bash
curl -X POST http://localhost:3000/api/create-checkout \
  -H "Content-Type: application/json" \
  -d '{"userId": "test-user-123"}'
```

Expected response:
```json
{
  "url": "https://checkout.stripe.com/c/pay/..."
}
```

Open the URL in a browser to test the checkout flow.

### 3. Generate Free License (for testing)

```bash
curl -X POST http://localhost:3000/api/generate-free-license \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_KEY" \
  -d '{
    "userId": "test-user-123",
    "email": "test@example.com"
  }'
```

**Note:** You need to set `ADMIN_KEY` in your `.env` file first.

### 4. Check License Status

```bash
curl -X POST http://localhost:3000/api/check-license \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-123",
    "licenseKey": "your-license-key"
  }'
```

### 5. Activate License

```bash
curl -X POST http://localhost:3000/api/activate-license \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-123",
    "licenseKey": "your-license-key"
  }'
```

## Testing Stripe Webhooks Locally

### Option 1: Stripe CLI (Recommended)

1. Install Stripe CLI: https://stripe.com/docs/stripe-cli

2. Login:
```bash
stripe login
```

3. Forward webhooks to your local server:
```bash
stripe listen --forward-to localhost:3000/api/stripe-webhook
```

This will give you a webhook signing secret (starts with `whsec_`). Add it to your `.env`:
```bash
STRIPE_WEBHOOK_SECRET=whsec_...
```

4. Trigger test events:
```bash
# Simulate a successful checkout
stripe trigger checkout.session.completed
```

### Option 2: Manual Webhook Testing

1. Go to Stripe Dashboard > Developers > Webhooks
2. Add endpoint: `http://localhost:3000/api/stripe-webhook`
3. Use Stripe CLI to forward events (see Option 1)

## Testing with the Extension

### 1. Update Extension Environment Variables

In your extension's `.env` file (or build-time variables), set:

```bash
VITE_API_BASE_URL=http://localhost:3000
VITE_STRIPE_CHECKOUT_URL=http://localhost:3000/api/create-checkout
```

### 2. Rebuild Extension

```bash
# From project root
npm run build
```

### 3. Load Extension in Chrome

1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `dist/` folder

### 4. Test Premium Flow

1. Open extension options
2. Go to Premium section
3. Click "Upgrade to Premium"
4. Complete test checkout (use Stripe test card: `4242 4242 4242 4242`)
5. Verify license activates automatically

## Test Cards (Stripe)

Use these test card numbers in Stripe checkout:

- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **3D Secure**: `4000 0025 0000 3155`

Use any future expiry date, any CVC, and any ZIP code.

## Troubleshooting

### Port Already in Use

If port 3000 is taken, you can change it in `server.js`:

```javascript
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
```

Then set `PORT=3001` in your `.env`.

### CORS Errors

The server has CORS enabled for all origins. If you see CORS errors, check that `cors()` middleware is enabled in `server.js`.

### Database Not Working

If Supabase isn't configured, the server will use in-memory storage. This is fine for testing, but data will be lost on restart.

### Webhook Signature Verification Fails

If you're testing webhooks locally without Stripe CLI, you can temporarily disable signature verification by commenting out the verification code in `server.js` (NOT recommended for production).

## Next Steps

Once local testing works:
1. Deploy to Vercel
2. Update extension environment variables to production URL
3. Set up production Stripe keys
4. Configure production webhook endpoint in Stripe Dashboard
