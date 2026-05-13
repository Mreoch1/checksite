const { Pool } = require("pg");

const pool = new Pool({
  connectionString: "postgresql://postgres:SKfsS4aZwuATZDdl@db.ybliuezkxrlgiydbfzqy.supabase.co:5432/postgres",
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
});

const sql = `
CREATE TABLE IF NOT EXISTS public.urgent_alerts (
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
CREATE INDEX IF NOT EXISTS idx_urgent_alerts_unresolved ON public.urgent_alerts (created_at DESC) WHERE resolved_at IS NULL;
`;

pool.query(sql)
  .then(r => { console.log("OK:", r.command); process.exit(0); })
  .catch(e => { console.log("FAIL:", e.message); process.exit(1); });
