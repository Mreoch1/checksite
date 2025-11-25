-- Add email_sent_at column to audits table to track when email was sent
-- This prevents duplicate emails from being sent for the same audit
ALTER TABLE audits ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMPTZ;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_audits_email_sent_at ON audits(email_sent_at);

