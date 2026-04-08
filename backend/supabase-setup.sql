-- Supabase Database Setup
-- Run this in your Supabase SQL editor

-- Create licenses table
CREATE TABLE IF NOT EXISTS licenses (
  id BIGSERIAL PRIMARY KEY,
  license_key VARCHAR(255) UNIQUE NOT NULL,
  user_id VARCHAR(255),
  license_type VARCHAR(50) DEFAULT 'premium', -- 'trial' or 'premium'
  stripe_session_id VARCHAR(255),
  stripe_customer_id VARCHAR(255),
  stripe_customer_email VARCHAR(320),
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  trial_started_at TIMESTAMPTZ, -- Only for trial licenses
  is_active BOOLEAN DEFAULT true,
  is_free BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_license_key ON licenses(license_key);
CREATE INDEX IF NOT EXISTS idx_user_id ON licenses(user_id);
CREATE INDEX IF NOT EXISTS idx_is_active ON licenses(is_active);
-- Ensure Stripe webhooks are idempotent (Stripe retries deliveries).
CREATE UNIQUE INDEX IF NOT EXISTS idx_stripe_session_id_unique
  ON licenses(stripe_session_id)
  WHERE stripe_session_id IS NOT NULL;

-- Support purchase restore / lookup by email (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_stripe_customer_email ON licenses(stripe_customer_email);

-- Enable Row Level Security (optional, for extra security)
ALTER TABLE licenses ENABLE ROW LEVEL SECURITY;

-- IMPORTANT SECURITY NOTE:
-- This table should be accessed ONLY by your backend using the Supabase Service Role key.
-- The Service Role bypasses RLS, so you do NOT need permissive RLS policies here.
--
-- Keeping RLS enabled with NO policies prevents the public "anon" key (which is exposed
-- in the extension for Auth) from reading/writing license records.
--
-- (Optional hardening) Ensure anon/authenticated roles have no direct table access.
REVOKE ALL ON TABLE licenses FROM anon, authenticated;
REVOKE ALL ON SEQUENCE licenses_id_seq FROM anon, authenticated;

-- Ensure the service role can access the table (usually already true in Supabase).
GRANT ALL ON TABLE licenses TO service_role;
GRANT ALL ON SEQUENCE licenses_id_seq TO service_role;

-- Optional: Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_licenses_updated_at BEFORE UPDATE ON licenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
