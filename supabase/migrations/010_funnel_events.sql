-- Funnel analytics: acquisition + upsell steps (see CURSOR_TICKET_001)

CREATE TABLE public.funnel_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  event_name TEXT NOT NULL,
  audit_id UUID REFERENCES public.audits(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  url TEXT,
  metadata JSONB
);

CREATE INDEX idx_funnel_events_name_created ON public.funnel_events (event_name, created_at DESC);
CREATE INDEX idx_funnel_events_session ON public.funnel_events (session_id);
CREATE INDEX idx_funnel_events_audit ON public.funnel_events (audit_id);

ALTER TABLE public.funnel_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "funnel_events_deny_anon" ON public.funnel_events
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

COMMENT ON TABLE public.funnel_events IS 'Marketing funnel steps; written via service role only';
