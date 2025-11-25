#!/bin/bash

echo "📊 Database Migration Setup"
echo ""
echo "Since Supabase requires authentication, please run the migration manually:"
echo ""
echo "1. Go to: https://supabase.com/dashboard/project/ybliuezkxrlgiydbfzqy/sql/new"
echo ""
echo "2. Copy the SQL from: supabase/migrations/001_initial_schema.sql"
echo ""
echo "3. Paste into the SQL Editor and click 'Run'"
echo ""
echo "Alternatively, if you have psql installed:"
echo ""

# Check if we can use psql
if command -v psql &> /dev/null; then
    echo "✅ psql found"
    echo ""
    echo "Run this command (replace PASSWORD with your database password):"
    echo "psql 'postgresql://postgres:[PASSWORD]@db.ybliuezkxrlgiydbfzqy.supabase.co:5432/postgres' -f supabase/migrations/001_initial_schema.sql"
else
    echo "⚠️  psql not found. Use the Supabase dashboard method above."
fi

echo ""

