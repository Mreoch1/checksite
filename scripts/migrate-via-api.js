/**
 * Run migration using Supabase Management API
 * This uses the service role key to execute SQL via the REST API
 */

const fetch = require('node-fetch')
const fs = require('fs')
const path = require('path')

const SUPABASE_URL = 'https://ybliuezkxrlgiydbfzqy.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlibGl1ZXpreHJsZ2l5ZGJmenF5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDAzMjc4NSwiZXhwIjoyMDc5NjA4Nzg1fQ.DDyIJuCm_m2-nY0jCmvXInn8JPKP36VpyXP898hkN8g'

async function runMigration() {
  console.log('📊 Running database migration...\n')
  
  const migrationPath = path.join(__dirname, '../supabase/migrations/001_initial_schema.sql')
  const sql = fs.readFileSync(migrationPath, 'utf8')
  
  // Split into statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))
  
  console.log(`Found ${statements.length} SQL statements\n`)
  
  // Supabase doesn't expose direct SQL execution via REST API
  // We need to use the Management API or psql
  console.log('⚠️  Supabase REST API does not support direct SQL execution.')
  console.log('   The migration needs to be run via one of these methods:\n')
  console.log('   1. Supabase Dashboard (Recommended):')
  console.log('      https://supabase.com/dashboard/project/ybliuezkxrlgiydbfzqy/sql/new\n')
  console.log('   2. Supabase CLI:')
  console.log('      supabase link --project-ref ybliuezkxrlgiydbfzqy')
  console.log('      supabase db push\n')
  console.log('   3. psql (if you have database password):')
  console.log('      ./scripts/run-migration-psql.sh\n')
  
  // Try to use Supabase CLI if available
  const { execSync } = require('child_process')
  
  try {
    console.log('Attempting to use Supabase CLI...\n')
    execSync('which supabase', { stdio: 'ignore' })
    
    console.log('✅ Supabase CLI found')
    console.log('   Run these commands:')
    console.log('   1. supabase link --project-ref ybliuezkxrlgiydbfzqy')
    console.log('   2. supabase db push')
    
  } catch (err) {
    console.log('⚠️  Supabase CLI not found')
    console.log('   Install: brew install supabase/tap/supabase')
  }
}

runMigration().catch(console.error)

