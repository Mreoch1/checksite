-- RPC function to get fresh audit state from primary database
-- This bypasses Supabase REST API replica routing

create or replace function get_audit_state(audit_id_param uuid)
returns table (
  id uuid,
  status text,
  email_sent_at timestamptz,
  formatted_report_html text
)
language plpgsql
as $$
begin
  return query
  select 
    a.id,
    a.status::text,
    a.email_sent_at,
    a.formatted_report_html
  from audits a
  where a.id = audit_id_param;
end;
$$;

-- Grant execute permission to service role
grant execute on function get_audit_state(uuid) to service_role;

