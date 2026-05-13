/**
 * apply-urgent-alerts.ts — Creates the urgent_alerts table if it doesn't exist.
 *
 * Reads connection string from env — NO hardcoded secrets.
 *
 * Usage:
 *   SUPABASE_DB_URL="postgresql://..." npx tsx scripts/apply-urgent-alerts.ts
 *
 * Or if SUPABASE_DB_URL is set in the environment (Netlify, .env, etc.):
 *   npx tsx scripts/apply-urgent-alerts.ts
 */

const { Pool } = require("pg");

const connectionString = process.env.SUPABASE_DB_URL;

if (!connectionString) {
  console.error("❌ SUPABASE_DB_URL environment variable is required.");
  console.error("   Set it to your Supabase database connection string.");
  console.error("   Example:");
  console.error("     SUPABASE_DB_URL=\"postgresql://postgres:password@db.example.supabase.co:5432/postgres\" npx tsx scripts/apply-urgent-alerts.ts");
  process.exit(1);
}

const pool = new Pool({
  connectionString,
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
  .then(r => {
    console.log("✅ urgent_alerts table ready.");
    process.exit(0);
  })
  .catch(e => {
    console.error("❌ Failed to create urgent_alerts:", e.message);
    process.exit(1);
  });
