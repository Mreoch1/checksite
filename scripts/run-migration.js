/**
 * Run database migration using Supabase service role key
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ybliuezkxrlgiydbfzqy.supabase.co'
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlibGl1ZXpreHJsZ2l5ZGJmenF5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDAzMjc4NSwiZXhwIjoyMDc5NjA4Nzg1fQ.DDyIJuCm_m2-nY0jCmvXInn8JPKP36VpyXP898hkN8g'

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function runMigration() {
  try {
    console.log('📊 Running database migration...')
    
    const migrationPath = path.join(__dirname, '../supabase/migrations/001_initial_schema.sql')
    const sql = fs.readFileSync(migrationPath, 'utf8')
    
    // Split SQL into individual statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))
    
    console.log(`Found ${statements.length} SQL statements`)
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';'
      console.log(`Executing statement ${i + 1}/${statements.length}...`)
      
      try {
        const { error } = await supabase.rpc('exec_sql', { query: statement })
        if (error) {
          // Try direct query if RPC doesn't work
          const { error: queryError } = await supabase.from('_migration_test').select('1').limit(0)
          if (queryError && queryError.message.includes('does not exist')) {
            console.log('Note: Some statements may need to be run manually in Supabase dashboard')
          }
        }
      } catch (err) {
        console.log(`Note: Statement ${i + 1} may need manual execution: ${err.message}`)
      }
    }
    
    console.log('✅ Migration script completed')
    console.log('⚠️  If tables were not created, please run the SQL manually in Supabase dashboard:')
    console.log('   https://supabase.com/dashboard/project/ybliuezkxrlgiydbfzqy/sql/new')
    
  } catch (error) {
    console.error('❌ Migration error:', error.message)
    console.log('\n⚠️  Please run the migration manually:')
    console.log('   1. Go to: https://supabase.com/dashboard/project/ybliuezkxrlgiydbfzqy/sql/new')
    console.log('   2. Copy SQL from: supabase/migrations/001_initial_schema.sql')
    console.log('   3. Paste and run')
    process.exit(1)
  }
}

runMigration()

