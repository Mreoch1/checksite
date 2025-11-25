#!/usr/bin/env node
/**
 * Apply Supabase migration using the Supabase client
 * This uses the service role key to execute SQL directly
 */

const { createClient } = require('@supabase/supabase-js')
const { execSync } = require('child_process')

// Get credentials from Netlify
const supabaseUrl = execSync('netlify env:get NEXT_PUBLIC_SUPABASE_URL 2>/dev/null', { encoding: 'utf8' }).trim()
const serviceKey = execSync('netlify env:get SUPABASE_SERVICE_ROLE_KEY 2>/dev/null', { encoding: 'utf8' }).trim()

if (!supabaseUrl || !serviceKey) {
  console.error('❌ Could not get Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function applyMigration() {
  console.log('📋 Applying Migration via Supabase Client')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('')
  
  const sql = 'ALTER TABLE audits ADD COLUMN IF NOT EXISTS error_log TEXT;'
  
  console.log('Migration SQL:')
  console.log(sql)
  console.log('')
  
  try {
    // Use Supabase REST API to execute SQL via rpc
    // Note: This requires a function in Supabase, or we use the Management API
    // For now, we'll use a direct approach with the PostgREST API
    
    // Actually, we need to use the Management API or psql for DDL
    // The REST API doesn't support direct DDL execution
    
    console.log('⚠️  Supabase REST API cannot execute DDL directly.')
    console.log('')
    console.log('Please apply the migration using one of these methods:')
    console.log('')
    console.log('1. Supabase Dashboard SQL Editor:')
    console.log(`   https://supabase.com/dashboard/project/ybliuezkxrlgiydbfzqy/sql/new`)
    console.log('   Run: ALTER TABLE audits ADD COLUMN IF NOT EXISTS error_log TEXT;')
    console.log('')
    console.log('2. Supabase CLI:')
    console.log('   supabase link --project-ref ybliuezkxrlgiydbfzqy')
    console.log('   supabase db push')
    console.log('')
    
    process.exit(1)
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

applyMigration()
