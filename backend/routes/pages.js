export function registerPageRoutes(app, { db }) {
  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Success page (simple HTML) - Shows license information
  app.get('/success', async (req, res) => {
    const sessionId = req.query.session_id;

    // Retrieve license by session ID (no user ID needed - more secure)
    let licenseKey = null;

    if (sessionId) {
      try {
        // Get license by Stripe session ID
        const license = await db.getLicenseByStripeSessionId(sessionId);
        if (license) {
          licenseKey = license.licenseKey;
        }
      } catch (e) {
        console.error('License retrieval failed:', e);
      }
    }

    // Basic hardening headers for simple HTML pages
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'none'; style-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"
    );
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payment Successful - Markopy Premium</title>
        <link rel="stylesheet" href="/public/pages.css" />
      </head>
      <body>
        <div class="success">
          <h1>✓ Payment Successful!</h1>
          <p>Thank you for purchasing Markopy Premium!</p>
        </div>
        <div class="card">
          <h2>License Ready</h2>
          <p>Your premium license has been created and will be automatically detected by the extension.</p>
          <p><strong>Next Steps:</strong></p>
          <ol>
            <li>Return to the Markopy extension</li>
            <li>Go to Settings → Premium section</li>
            <li>Click "Check License Status" to refresh</li>
            <li>Your license should activate automatically!</li>
          </ol>
          ${
            licenseKey
              ? `<p><strong>Your License Key:</strong></p><div class="license-box">${escapeHtml(licenseKey)}</div>`
              : ''
          }
          <p class="muted mt-16">
            <strong>Note:</strong> The extension will automatically detect your license.
            If it doesn't appear immediately, click "Check License Status" in the extension settings.
          </p>
        </div>
      </body>
      </html>
    `);
  });

  // Cancel page
  app.get('/cancel', (_req, res) => {
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'none'; style-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"
    );
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payment Cancelled</title>
        <link rel="stylesheet" href="/public/pages.css" />
      </head>
      <body>
        <div class="card center">
          <h1>Payment Cancelled</h1>
          <p>Your payment was cancelled. You can try again anytime.</p>
        </div>
      </body>
      </html>
    `);
  });
}
