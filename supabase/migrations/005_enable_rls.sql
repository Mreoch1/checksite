-- Enable Row Level Security (RLS) on all public tables
-- This migration addresses security linter warnings about RLS being disabled

-- Enable RLS on customers table
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Enable RLS on audits table
ALTER TABLE public.audits ENABLE ROW LEVEL SECURITY;

-- Enable RLS on audit_modules table
ALTER TABLE public.audit_modules ENABLE ROW LEVEL SECURITY;

-- Enable RLS on audit_queue table
ALTER TABLE public.audit_queue ENABLE ROW LEVEL SECURITY;

-- Create policies to deny all access for anon role
-- This is a backend service that uses service_role key, which bypasses RLS
-- Denying anon access prevents accidental exposure via public API

-- Deny all access to customers table for anon role
CREATE POLICY "customers_deny_anon" ON public.customers
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

-- Deny all access to audits table for anon role
CREATE POLICY "audits_deny_anon" ON public.audits
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

-- Deny all access to audit_modules table for anon role
CREATE POLICY "audit_modules_deny_anon" ON public.audit_modules
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

-- Deny all access to audit_queue table for anon role
CREATE POLICY "audit_queue_deny_anon" ON public.audit_queue
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

-- Note: service_role bypasses RLS by default, so all existing server-side
-- operations using SUPABASE_SERVICE_ROLE_KEY will continue to work normally
