# Markopy Backend API

Backend API for Markopy Premium license management and Stripe integration.

**For complete setup instructions, see [`../SETUP_COMPLETE.md`](../SETUP_COMPLETE.md)**

**For local testing, see [`LOCAL_TESTING.md`](./LOCAL_TESTING.md)**

## Database: Supabase (Recommended)

The backend now uses Supabase for persistent storage. See `supabase-setup.sql` for database schema.

**Setup:**
1. Create Supabase account (free tier)
2. Run `supabase-setup.sql` in SQL Editor
3. Get API keys from Project Settings
4. Add to Vercel environment variables

## Free Tier Hosting Options

### Recommended: **Vercel** (Easiest)
- OK Free tier: Unlimited serverless functions
- OK Automatic HTTPS
- OK Easy deployment from Git
- OK Built-in environment variables
- Note: In-memory storage won't persist (use external DB for production)

**Setup:**
1. Push this folder to GitHub
2. Connect to Vercel
3. Deploy automatically

### Alternative Options:

1. **Railway** (Recommended for persistent storage)
   - Free tier: $5 credit/month
   - Supports persistent storage
   - Easy PostgreSQL/MongoDB setup

2. **Render**
   - Free tier: 750 hours/month
   - Supports databases
   - Auto-deploy from Git

3. **Fly.io**
   - Free tier: 3 shared VMs
   - Good for persistent apps

4. **Supabase** (For database)
   - Free PostgreSQL database
   - Use with Vercel for serverless functions

## Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Get Stripe Keys

1. Go to https://dashboard.stripe.com/test/apikeys
2. Copy your **Secret key** (starts with `sk_test_`)
3. Copy your **Publishable key** (starts with `pk_test_`)

### 3. Set Up Environment Variables

Create `.env` file:

```bash
cp .env.example .env
```

Edit `.env` with your Stripe keys and CORS origins (in production, `ALLOWED_ORIGINS` must not be `*`):

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
BASE_URL=http://localhost:3000
ALLOWED_ORIGINS=chrome-extension://YOUR_EXTENSION_ID
```

### 4. Get Webhook Secret (for production)

1. Install Stripe CLI: https://stripe.com/docs/stripe-cli
2. Login: `stripe login`
3. Forward webhooks: `stripe listen --forward-to localhost:3000/api/stripe-webhook`
4. Copy the webhook secret (starts with `whsec_`)
5. Add to `.env`: `STRIPE_WEBHOOK_SECRET=whsec_...`

### 5. Run Locally

```bash
npm run dev
```

Server runs on http://localhost:3000

### 6. Test Endpoints

```bash
# Health check
curl http://localhost:3000/api/health

# Check license (should return false for new install)
curl -X POST http://localhost:3000/api/check-license \
  -H "Content-Type: application/json" \
  -d '{"userId":"test-user"}'
```

## Deployment to Vercel

### Option 1: Vercel CLI

```bash
npm i -g vercel
cd backend
vercel
```

Follow prompts, then:

 ```bash
 vercel env add STRIPE_SECRET_KEY
 vercel env add STRIPE_WEBHOOK_SECRET
 vercel env add BASE_URL
 vercel env add ALLOWED_ORIGINS
 ```

### Option 2: GitHub + Vercel Dashboard

1. Push backend folder to GitHub
2. Go to https://vercel.com/new
3. Import your repository
4. Set root directory to `backend`
5. Add environment variables in Vercel dashboard
6. Deploy!

### Important: Update Extension Config

After deployment, set the extension build-time env vars (recommended):

```env
VITE_API_BASE_URL=https://your-api.vercel.app
```

If you use email linking for multi-device Premium, also set:

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

## Database Options (For Production)

The current implementation uses in-memory storage. For production, use:

### Option 1: Vercel KV (Redis)
```bash
npm install @vercel/kv
```

### Option 2: Supabase (PostgreSQL)
```bash
npm install @supabase/supabase-js
```

### Option 3: MongoDB Atlas (Free tier)
```bash
npm install mongodb
```

See `BACKEND_API.md` for database schema examples.

## Testing with Stripe

### Test Cards:
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- Any future expiry date
- Any 3-digit CVC

### Test Flow:

1. Start local server: `npm run dev`
2. Forward webhooks: `stripe listen --forward-to localhost:3000/api/stripe-webhook`
3. Create checkout (from extension or API):
   ```bash
   curl -X POST http://localhost:3000/api/create-checkout \
     -H "Content-Type: application/json" \
     -d '{"userId":"test-user"}'
   ```
4. Complete payment with test card
5. Check license was created
6. Activate license in extension

## Production Checklist

- [ ] Set up production Stripe account
- [ ] Get production API keys
- [ ] Set up database (replace in-memory storage)
- [ ] Configure webhook endpoint in Stripe dashboard
- [ ] Set up email service for license keys
- [ ] Update BASE_URL to production URL
- [ ] Update extension with production API URL
- [ ] Test end-to-end flow
- [ ] Set up monitoring/logging
