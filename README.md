# Markopy – Markdown copier extension (MV3)

A Chrome-compatible extension that copies page content, selections, or links to Markdown with templates, quick actions, and clipboard history. Built with Vue 3 + Vite + TypeScript and bundled via `@crxjs/vite-plugin`.

## Features

### Free Features
- Context menu + keyboard commands for copy selection, page, or links
- Template library with placeholders and per-operation defaults
- Quick actions mapped to Chrome command slots
- Offscreen clipboard fallback for restricted pages
- Clipboard history, copy stats, dark/light theme toggle
- Custom templates with selector placeholders

### Premium Features ($4.99 one-time)
- **Interactive Selector Picker** - Click any element to generate CSS selectors
- **Multi-Field Data Extraction** - Extract data from multiple fields simultaneously
- **Smart Paste with Selector Targeting** - Paste extracted data into specific form fields
- **Advanced Template Features** - Use selector-based placeholders in templates

## Quick Start

### Development
```bash
npm install
npm run dev      # starts CRX dev server with HMR
npm run build    # type-check + production bundle to dist/
```

Load the unpacked extension from `dist/` in Chrome/Edge (`chrome://extensions`, enable Developer Mode).

### Premium Setup (Quick Overview)

1. **Stripe Account**
   - Create account at https://stripe.com
   - Get API keys from dashboard (test mode: `sk_test_...`, `pk_test_...`)
   - Set up webhook after backend deployment

2. **Supabase Database**
   - Create account at https://supabase.com
   - Run `backend/supabase-setup.sql` in SQL Editor
   - Get API keys from Project Settings

3. **Backend Deployment (Vercel)**
   - Push `backend/` to GitHub
   - Connect to Vercel, set root directory to `backend`
   - Add environment variables (see `backend/README.md`)
   - Deploy

4. **Extension Configuration**
   - Create `.env` file:
     ```env
     VITE_API_BASE_URL=https://your-api.vercel.app
     VITE_SUPABASE_URL=https://xxxxx.supabase.co
     VITE_SUPABASE_ANON_KEY=eyJ...
     ```
   - Rebuild: `npm run build`

5. **Testing**
   - Test card: `4242 4242 4242 4242`
   - Check Supabase for license key after purchase
   - Activate in extension settings

**For detailed setup instructions, see `.archive/documentation/SETUP_COMPLETE.md`**

## Development Workflow

### Standard Workflow
```bash
npm run dev      # Start dev server with HMR
# Load dist/ in Chrome (chrome://extensions)
# Edit code → Changes reflect automatically (UI) or reload (service worker)
npm run build    # Production build
```

### Debugging
- **Service Worker:** Click "service worker" link in `chrome://extensions/`
- **Popup/Options:** Right-click extension icon → "Inspect popup"
- **Content Scripts:** Open DevTools on target page

### Hot Reload
- ✅ **Auto-reloads:** Vue components, CSS, content scripts (on page refresh)
- ⚠️ **Manual reload:** Service worker, manifest changes

**For detailed workflow, see `.archive/documentation/DEVELOPMENT_WORKFLOW.md`**

## Premium Features

### Interactive Selector Picker
- Right-click → "Pick Selector (Premium)"
- Click any element to generate CSS selector
- Save selector for use in templates

### Multi-Field Data Extraction
- Define selectors in Copy Page/Links settings
- Use `{{selectorName}}` placeholders in templates
- Extract and copy formatted data

### Smart Paste
- Extract data from one page
- Navigate to target page
- Paste with selectors to fill matching fields

**For detailed feature docs, see `.archive/documentation/PREMIUM_FEATURES.md`**

## Backend API

### Required Endpoints
- `POST /api/create-checkout` - Create Stripe checkout session
- `POST /api/stripe-webhook` - Handle payment webhooks
- `POST /api/check-license` - Verify license status
- `POST /api/activate-license` - Activate license key
- `POST /api/generate-free-license` - Admin endpoint for free licenses

### Environment Variables
```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
BASE_URL=https://your-api.vercel.app
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
ADMIN_KEY=your-secret-admin-key
```

**For detailed API docs, see `.archive/documentation/BACKEND_API.md`**

## Project Structure

### Extension Code
- `src/manifest.json` – Extension manifest (MV3)
- `src/background/` – Service worker (context menus, commands, offscreen doc)
- `src/content/` – Content script (extraction, Markdown conversion, premium features)
- `src/popup/` – Popup UI (history, quick actions, stats)
- `src/options/` – Settings UI (templates, selectors, quick actions, premium)
- `src/offscreen/` – Offscreen clipboard writer
- `src/shared/` – Shared utilities (storage, premium, Markdown utils)

### Backend
- `backend/` – Express API server with Stripe integration
- `backend/server.js` – Main API server
- `backend/db.js` – Database abstraction (Supabase/in-memory)
- `backend/supabase-setup.sql` – Database schema

### Documentation
- `README.md` – This file (quick reference)
- `PRIVACY_POLICY.md` – Privacy policy (required for Chrome Web Store)
- `.archive/documentation/` – Detailed setup, API, and feature docs
- `.archive/planning-docs/` – Planning and roadmap documents
- `.archive/research-and-strategy/` – Business strategy and research

## Testing

### Basic Features
- Content scripts use programmatic injection with `activeTab` permission
- Popup: Copy Page / Copy Links buttons
- Options: Add templates, configure per-operation settings, toggle attribution
- Keyboard shortcuts: Bind via `chrome://extensions/shortcuts`

### Premium Features
- Right-click → "Pick Selector (Premium)" - Interactive selector picker
- Settings → Premium section - License activation
- Test with Stripe test card: `4242 4242 4242 4242`

## License Key Flow

1. **Purchase:** User completes Stripe checkout
2. **Webhook:** Stripe sends payment confirmation to backend
3. **Generation:** Backend creates license key, stores in Supabase
4. **Activation:** User enters license key in extension settings (or auto-detected via user ID)
5. **Verification:** Extension checks backend API on startup/feature use
6. **Unlock:** Premium features enabled

## Free Licenses

Generate free licenses for family/friends:

```bash
curl -X POST https://your-api.vercel.app/api/generate-free-license \
  -H "Content-Type: application/json" \
  -d '{"adminKey":"your-admin-key","email":"friend@example.com"}'
```

## Release Process

- Build artifacts (`dist/`, `release.zip`) are gitignored
- Version bump: Update `package.json` and `src/manifest.json`
- Build: `npm run build`
- Load from `dist/` for testing
- Submit to Chrome Web Store for distribution

## Documentation

**Quick Reference:** This README
**Detailed Docs:** See `.archive/documentation/` for:
- Complete setup guide
- Premium features documentation
- Backend API reference
- Development workflow details
