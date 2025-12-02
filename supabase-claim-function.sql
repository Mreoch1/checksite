-- Create a PostgreSQL function to atomically claim the oldest pending queue item
-- This runs in a single transaction on the primary database, eliminating stale read issues
-- FOR UPDATE SKIP LOCKED ensures safe concurrent access
--
-- INVARIANTS:
-- 1. Only claims queue items with status='pending'
-- 2. Only claims audits where email_sent_at is NULL, empty, or a reservation ('sending_...')
-- 3. Returns exactly 0 or 1 row (never multiple)
-- 4. Atomically updates status from 'pending' to 'processing' in a single transaction

create or replace function public.claim_oldest_audit_queue()
returns setof audit_queue
language plpgsql
as $$
begin
  return query
  update audit_queue
  set
    status      = 'processing',
    started_at  = now(),
    retry_count = coalesce(retry_count, 0) + 1
  where id = (
    select aq.id
    from audit_queue aq
    inner join audits a on a.id = aq.audit_id
    where aq.status = 'pending'
      and (
        -- Only claim audits that haven't been emailed yet
        -- This includes: NULL, empty string, short strings, or 'sending_...' reservations
        a.email_sent_at is null 
        or coalesce(trim(a.email_sent_at::text), '') = ''
        or length(coalesce(trim(a.email_sent_at::text), '')) <= 10
        or a.email_sent_at::text like 'sending_%'
      )
    order by aq.created_at
    limit 1
    for update skip locked
  )
  returning *;
end;
$$;

-- Grant execute permission to service role
grant execute on function public.claim_oldest_audit_queue() to service_role;
