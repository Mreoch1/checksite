-- Free report survey: update schema for preview/upgrade model
-- Old columns remain for historical data; new columns replace them going forward

ALTER TABLE public.free_report_survey_responses
  ADD COLUMN IF NOT EXISTS preview_helpful TEXT,
  ADD COLUMN IF NOT EXISTS did_upgrade TEXT,
  ADD COLUMN IF NOT EXISTS upgrade_worth TEXT,
  ADD COLUMN IF NOT EXISTS improvement_suggestions TEXT;

COMMENT ON COLUMN public.free_report_survey_responses.preview_helpful IS 'Did the free preview help understand website issues? (yes/somewhat/no)';
COMMENT ON COLUMN public.free_report_survey_responses.did_upgrade IS 'Did the user upgrade to full report? (yes/no_but_interested/no_not_useful/no_too_expensive/no_didnt_see_option)';
COMMENT ON COLUMN public.free_report_survey_responses.upgrade_worth IS 'Was the full report worth the purchase? (yes/partially/no) - only if upgraded';
COMMENT ON COLUMN public.free_report_survey_responses.improvement_suggestions IS 'Free text improvement suggestions';
