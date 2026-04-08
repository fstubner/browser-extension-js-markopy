-- Migration: Add trial support to existing licenses table
-- Run this if you already have a licenses table

-- Add new columns
ALTER TABLE licenses
ADD COLUMN IF NOT EXISTS license_type VARCHAR(50) DEFAULT 'premium',
ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS stripe_customer_email VARCHAR(320);

-- Update existing licenses to 'premium' type
UPDATE licenses
SET license_type = 'premium'
WHERE license_type IS NULL;

-- Add index for license type lookups
CREATE INDEX IF NOT EXISTS idx_license_type ON licenses(license_type);

-- Add index for email restore flows
CREATE INDEX IF NOT EXISTS idx_stripe_customer_email ON licenses(stripe_customer_email);

-- Add index for trial expiry checks
CREATE INDEX IF NOT EXISTS idx_trial_expires ON licenses(expires_at)
WHERE license_type = 'trial';

-- Add check constraint to ensure valid license types
ALTER TABLE licenses
ADD CONSTRAINT chk_license_type
CHECK (license_type IN ('trial', 'premium'));

-- Update comment
COMMENT ON COLUMN licenses.license_type IS 'License type: trial (7 days free) or premium (lifetime paid)';
COMMENT ON COLUMN licenses.trial_started_at IS 'Timestamp when trial was started (only for trial licenses)';
