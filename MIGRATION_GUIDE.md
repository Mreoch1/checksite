# Database Migration Guide

## Option 1: Supabase CLI (Recommended)

```bash
# 1. Install Supabase CLI (if not installed)
brew install supabase/tap/supabase

# 2. Initialize Supabase project (if needed)
supabase init

# 3. Link to your project
supabase link --project-ref ybliuezkxrlgiydbfzqy
# You'll be prompted for your database password
# Get it from: https://supabase.com/dashboard/project/ybliuezkxrlgiydbfzqy/settings/database

# 4. Push the migration
supabase db push
```

Or use the helper script:
```bash
./scripts/run-supabase-migration.sh
```

## Option 2: Supabase Dashboard (Easiest)

1. Go to: https://supabase.com/dashboard/project/ybliuezkxrlgiydbfzqy/sql/new
2. Open `supabase/migrations/001_initial_schema.sql` in your project
3. Copy all SQL content
4. Paste into Supabase SQL Editor
5. Click "Run"

## Option 3: psql (If you have PostgreSQL installed)

```bash
# Get your database password from Supabase dashboard
# Then run:
./scripts/run-migration-psql.sh
```

## Verify Migration

After running the migration, verify tables were created:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('customers', 'audits', 'audit_modules');
```

You should see all three tables listed.

