-- 012_urgent_alerts.sql
-- Durable alert table for delivery monitoring and other P0 notifications.
-- Replaces the ephemeral /tmp file approach that silently fails on Netlify.

CREATE TABLE IF NOT EXISTS urgent_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  severity text NOT NULL CHECK (severity IN ('p0', 'p1', 'p2')) DEFAULT 'p0',
  source text NOT NULL DEFAULT 'm003_delivery_monitor',
  category text NOT NULL,
  message text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  resolved_at timestamptz,
  notes text
);

CREATE INDEX idx_urgent_alerts_unresolved ON urgent_alerts (created_at DESC) WHERE resolved_at IS NULL;
