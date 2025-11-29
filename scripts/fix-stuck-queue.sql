-- Fix Stuck Queue Items
-- Run this in Supabase SQL Editor

-- 1. Reset stuck "processing" items back to "pending" (processing for >10 minutes)
UPDATE audit_queue
SET status = 'pending',
    started_at = NULL,
    last_error = 'Reset from stuck processing state'
WHERE status = 'processing'
  AND started_at < NOW() - INTERVAL '10 minutes';

-- 2. Clear abandoned email reservations (>30 minutes old)
UPDATE audits
SET email_sent_at = NULL
WHERE email_sent_at IS NOT NULL
  AND email_sent_at < NOW() - INTERVAL '30 minutes'
  AND status = 'completed'
  AND formatted_report_html IS NOT NULL;

-- 3. Check results
SELECT 
  aq.status,
  COUNT(*) as count,
  MIN(age(now(), aq.created_at)) as oldest
FROM audit_queue aq
GROUP BY aq.status;

