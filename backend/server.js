import dotenv from 'dotenv';
import * as db from './db.js';
import { createApp } from './app.js';
import { fileURLToPath } from 'url';

dotenv.config();

// Validate required environment variables
function validateEnv() {
  const missing = [
    'LEMONSQUEEZY_WEBHOOK_SECRET',
    'BASE_URL'
  ].filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing.join(', '));
    console.error('PLease set these in your Vercel project settings or .env file');
    process.exit(1);
  }

  // Optional but recommended
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.warn('⚠️  Supabase not configured - using in-memory storage (data will be lost on restart)');
  }

  console.log('✅ Environment variables validated');
}

validateEnv();

// Initialize database
db.initDatabase();

// No Stripe dependency passed
const app = createApp({ db });

// Vercel serverless expects the module to export a handler (Express app is a handler).
export default app;

// Local development: start a real HTTP server only when executed directly.
const isDirectRun = process.argv[1] === fileURLToPath(import.meta.url);
if (isDirectRun) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
  });
}
