-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create audits table
CREATE TABLE IF NOT EXISTS audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  total_price_cents INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  raw_result_json JSONB,
  formatted_report_html TEXT,
  formatted_report_plaintext TEXT
);

-- Create audit_modules table
CREATE TABLE IF NOT EXISTS audit_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
  module_key TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  raw_score INTEGER CHECK (raw_score >= 0 AND raw_score <= 100),
  raw_issues_json JSONB
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_audits_customer_id ON audits(customer_id);
CREATE INDEX IF NOT EXISTS idx_audits_status ON audits(status);
CREATE INDEX IF NOT EXISTS idx_audit_modules_audit_id ON audit_modules(audit_id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);

