-- Fix audits that have reports or emails but are marked as failed
-- This fixes audits that were incorrectly marked as failed due to timing issues

-- Fix audits with reports
UPDATE audits
SET 
  status = 'completed',
  completed_at = COALESCE(completed_at, NOW())
WHERE 
  status = 'failed'
  AND formatted_report_html IS NOT NULL
  AND formatted_report_html != '';

-- Fix audits with emails (even if no report yet)
UPDATE audits
SET 
  status = 'completed',
  completed_at = COALESCE(completed_at, NOW())
WHERE 
  status = 'failed'
  AND email_sent_at IS NOT NULL;

-- Also mark corresponding queue items as completed
UPDATE audit_queue
SET 
  status = 'completed',
  completed_at = NOW()
WHERE 
  status IN ('pending', 'processing', 'failed')
  AND audit_id IN (
    SELECT id FROM audits 
    WHERE status = 'completed' 
    AND (formatted_report_html IS NOT NULL OR email_sent_at IS NOT NULL)
  );

-- Show what was fixed
SELECT 
  id,
  url,
  status,
  CASE 
    WHEN formatted_report_html IS NOT NULL THEN 'Has report'
    ELSE 'No report'
  END as report_status,
  CASE 
    WHEN email_sent_at IS NOT NULL THEN 'Email sent'
    ELSE 'No email'
  END as email_status,
  created_at,
  completed_at
FROM audits
WHERE id IN (
  '06b4dc64-6fab-47d6-b10e-8e65af93c195',
  '8af2080e-4af3-49dc-942c-4ae42354b2ab'
)
ORDER BY created_at DESC;
