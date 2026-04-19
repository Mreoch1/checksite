-- Marketing consent (free first report), delayed follow-up email tracking, survey responses

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS marketing_consent_at TIMESTAMPTZ;

COMMENT ON COLUMN public.customers.marketing_consent_at IS 'When the customer agreed to follow-up and marketing email (required for first free report).';

ALTER TABLE public.audits
  ADD COLUMN IF NOT EXISTS free_report_follow_up_sent_at TIMESTAMPTZ;

COMMENT ON COLUMN public.audits.free_report_follow_up_sent_at IS 'When the branded free-report follow-up questionnaire email was sent (null if not sent).';

CREATE TABLE IF NOT EXISTS public.free_report_survey_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID NOT NULL REFERENCES public.audits(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  overall_rating TEXT NOT NULL,
  met_expectations TEXT NOT NULL,
  would_purchase_full TEXT NOT NULL,
  additional_comments TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_free_report_survey_one_per_audit
  ON public.free_report_survey_responses (audit_id);

ALTER TABLE public.free_report_survey_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "free_report_survey_responses_deny_anon"
  ON public.free_report_survey_responses
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);
