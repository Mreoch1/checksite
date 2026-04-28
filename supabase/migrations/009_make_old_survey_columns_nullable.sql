-- Make old survey columns nullable (replaced by new preview/upgrade columns)
ALTER TABLE public.free_report_survey_responses
  ALTER COLUMN overall_rating DROP NOT NULL,
  ALTER COLUMN met_expectations DROP NOT NULL,
  ALTER COLUMN would_purchase_full DROP NOT NULL;
