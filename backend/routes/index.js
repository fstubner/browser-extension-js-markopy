import { registerHealthRoutes } from './health.js';
import { registerLicenseRoutes } from './license.js';
import { registerPageRoutes } from './pages.js';
import { registerWebhookRoutes } from './webhooks.js';
import { registerEntitlementRoutes } from './entitlements.js';

export function registerRoutes(app, deps) {
  registerHealthRoutes(app, deps);

  // Lemon Squeezy routes
  registerWebhookRoutes(app, deps);
  registerEntitlementRoutes(app, deps);

  registerLicenseRoutes(app, deps);
  registerPageRoutes(app, deps);
}
