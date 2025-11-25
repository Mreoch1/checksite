-- Add error_log field to audits table to store error details
ALTER TABLE audits ADD COLUMN IF NOT EXISTS error_log TEXT;
