# Backend Test Suite

## Test Types

### 1. Unit Tests (`api.test.js`)
**Status:** ✅ Always runs

These tests use **mocks** to test the application logic without making real API calls:
- Fast execution
- No external dependencies
- Tests business logic and error handling
- Safe to run in CI/CD

**Run:**
```bash
npm test
```

### 2. Integration Tests (`integration.test.js`)
**Status:** ⚠️ Requires Stripe test API key

These tests make **real API calls** to Stripe's test environment:
- Tests actual Stripe integration
- Requires network access
- Uses Stripe test keys (safe, no real charges)
- Slower execution

**Setup:**
1. Get Stripe test API key from https://dashboard.stripe.com/test/apikeys
2. Set environment variable:
   ```bash
   export STRIPE_SECRET_KEY_TEST=sk_test_...
   ```
3. (Optional) Set webhook secret for webhook tests:
   ```bash
   export STRIPE_WEBHOOK_SECRET_TEST=whsec_...
   ```

**Run:**
```bash
# With test key
STRIPE_SECRET_KEY_TEST=sk_test_... npm test:integration

# Or set in .env file
npm test:integration
```

**Note:** If no test key is provided, integration tests are automatically skipped.
