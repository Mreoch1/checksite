#!/bin/bash

echo "📊 Database Migration via psql"
echo ""

# Check if psql is installed
if ! command -v psql &> /dev/null; then
    echo "❌ psql not found. Install PostgreSQL:"
    echo "   brew install postgresql"
    exit 1
fi

echo "✅ psql found"
echo ""
echo "To run the migration, you need your Supabase database password."
echo ""
echo "Get it from: https://supabase.com/dashboard/project/ybliuezkxrlgiydbfzqy/settings/database"
echo ""
read -p "Enter your database password: " -s DB_PASSWORD
echo ""

if [ -z "$DB_PASSWORD" ]; then
    echo "❌ Password required"
    exit 1
fi

echo "Running migration..."
psql "postgresql://postgres.${DB_PASSWORD}@aws-0-us-east-1.pooler.supabase.com:6543/postgres" -f supabase/migrations/001_initial_schema.sql

if [ $? -eq 0 ]; then
    echo "✅ Migration completed successfully!"
else
    echo "❌ Migration failed. Try the Supabase dashboard method instead."
fi

