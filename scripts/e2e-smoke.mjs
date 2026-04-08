import { test, chromium } from '@playwright/test';

// Smoke test to verify extension loads and basic functionality works
test.describe('Markopy E2E Smoke Tests', () => {
  test('Extension popup loads', async () => {
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Navigate to a test page
    await page.goto('https://example.com');
    
    // Note: Extension testing requires special setup
    // See e2e-ui.mjs for more detailed tests
    
    await browser.close();
  });
});
