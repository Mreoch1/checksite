-- Create audit_queue table for processing audits outside of Netlify's 10-second timeout
CREATE TABLE IF NOT EXISTS audit_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  retry_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  UNIQUE(audit_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_audit_queue_status ON audit_queue(status);
CREATE INDEX IF NOT EXISTS idx_audit_queue_created_at ON audit_queue(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_queue_audit_id ON audit_queue(audit_id);

