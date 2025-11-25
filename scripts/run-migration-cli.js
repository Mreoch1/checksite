/**
 * Run database migration using Supabase service role key via REST API
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const supabaseUrl = 'https://ybliuezkxrlgiydbfzqy.supabase.co'
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlibGl1ZXpreHJsZ2l5ZGJmenF5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDAzMjc4NSwiZXhwIjoyMDc5NjA4Nzg1fQ.DDyIJuCm_m2-nY0jCmvXInn8JPKP36VpyXP898hkN8g'

async function runMigration() {
  console.log('📊 Running database migration via Supabase API...\n')
  
  const migrationPath = path.join(__dirname, '../supabase/migrations/001_initial_schema.sql')
  const sql = fs.readFileSync(migrationPath, 'utf8')
  
  // Use fetch to execute SQL via Supabase REST API
  // Note: Supabase doesn't expose direct SQL execution via REST API
  // We'll need to use psql or the dashboard
  
  console.log('⚠️  Supabase REST API does not support direct SQL execution.')
  console.log('   Using alternative method...\n')
  
  // Try using Supabase JS client to create tables directly
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false }
  })
  
  // Create customers table
  console.log('Creating customers table...')
  try {
    const { error } = await supabase.rpc('exec_sql', { 
      sql: `CREATE TABLE IF NOT EXISTS customers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT NOT NULL UNIQUE,
        name TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );`
    })
    if (error) throw error
    console.log('✅ Customers table created')
  } catch (err) {
    console.log('⚠️  Could not create via RPC, trying direct method...')
  }
  
  console.log('\n📝 Migration SQL prepared.')
  console.log('   Since Supabase API has limitations, please run the migration via:')
  console.log('   1. Supabase Dashboard: https://supabase.com/dashboard/project/ybliuezkxrlgiydbfzqy/sql/new')
  console.log('   2. Or use psql with your database password')
  console.log('\n   SQL file: supabase/migrations/001_initial_schema.sql')
}

runMigration().catch(console.error)

