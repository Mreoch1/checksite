-- SendGrid Event Webhook storage (CURSOR_TICKET_002)

CREATE TABLE public.email_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sg_event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  email TEXT NOT NULL,
  audit_id UUID REFERENCES public.audits(id) ON DELETE SET NULL,
  email_category TEXT,
  sg_message_id TEXT,
  url TEXT,
  user_agent TEXT,
  ip TEXT,
  raw JSONB NOT NULL
);

CREATE INDEX idx_email_events_type_created ON public.email_events (event_type, created_at DESC);
CREATE INDEX idx_email_events_audit ON public.email_events (audit_id);
CREATE INDEX idx_email_events_category_type ON public.email_events (email_category, event_type);

ALTER TABLE public.email_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "email_events_deny_anon" ON public.email_events
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

COMMENT ON TABLE public.email_events IS 'SendGrid webhook events; service role only';

-- Batch insert with idempotency (ON CONFLICT DO NOTHING). Returns number of rows inserted.
CREATE OR REPLACE FUNCTION public.insert_email_events_batch(p_events jsonb)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  inserted_count integer;
BEGIN
  INSERT INTO public.email_events (
    sg_event_id,
    event_type,
    email,
    audit_id,
    email_category,
    sg_message_id,
    url,
    user_agent,
    ip,
    raw
  )
  SELECT
    trim(e->>'sg_event_id'),
    trim(e->>'event_type'),
    trim(e->>'email'),
    CASE
      WHEN e->>'audit_id' IS NOT NULL AND length(trim(e->>'audit_id')) > 0
      THEN trim(e->>'audit_id')::uuid
      ELSE NULL
    END,
    NULLIF(trim(e->>'email_category'), ''),
    NULLIF(trim(e->>'sg_message_id'), ''),
    NULLIF(trim(e->>'url'), ''),
    NULLIF(trim(e->>'user_agent'), ''),
    NULLIF(trim(e->>'ip'), ''),
    COALESCE(e->'raw', '{}'::jsonb)
  FROM jsonb_array_elements(p_events) AS e
  WHERE e ? 'sg_event_id'
    AND length(trim(COALESCE(e->>'sg_event_id', ''))) > 0
  ON CONFLICT (sg_event_id) DO NOTHING;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count;
END;
$$;
