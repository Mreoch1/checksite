-- Create a PostgreSQL function to atomically claim the oldest pending queue item
-- This runs in a single transaction on the primary database, eliminating stale read issues
-- FOR UPDATE SKIP LOCKED ensures safe concurrent access

create or replace function claim_oldest_audit_queue()
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
        a.email_sent_at is null 
        or coalesce(trim(a.email_sent_at::text), '') = ''
        or length(coalesce(trim(a.email_sent_at::text), '')) <= 10
        or coalesce(a.email_sent_at::text, '') like 'sending_%'
      )
    order by aq.created_at
    limit 1
    for update skip locked
  )
  returning *;
end;
$$;

-- Grant execute permission to service role
grant execute on function claim_oldest_audit_queue() to service_role;

