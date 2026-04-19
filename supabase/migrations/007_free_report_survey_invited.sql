-- Marks audits where we sent a follow-up questionnaire email (including admin test),
-- so /survey/free-report can accept submissions even when total_price_cents > 0.

ALTER TABLE public.audits
  ADD COLUMN IF NOT EXISTS free_report_survey_invited_at TIMESTAMPTZ;

COMMENT ON COLUMN public.audits.free_report_survey_invited_at IS 'When we sent the branded follow-up questionnaire email for this audit (admin test or production batch).';
