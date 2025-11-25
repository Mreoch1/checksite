#!/bin/bash
# Apply Supabase migration using CLI (preferred method)

set -e

echo "📋 Applying Supabase Migration via CLI"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

PROJECT_REF="ybliuezkxrlgiydbfzqy"
MIGRATION_FILE="supabase/migrations/002_add_error_log.sql"

# Check if migration file exists
if [ ! -f "$MIGRATION_FILE" ]; then
  echo "❌ Migration file not found: $MIGRATION_FILE"
  exit 1
fi

echo "Project ref: $PROJECT_REF"
echo "Migration file: $MIGRATION_FILE"
echo ""

# Check if project is already linked
if [ -f ".supabase/config.toml" ]; then
  echo "✅ Supabase project appears to be linked"
  echo "Pushing migrations..."
  supabase db push
else
  echo "📋 Linking Supabase project..."
  echo ""
  echo "You'll be prompted for the database password."
  echo "Get it from: https://supabase.com/dashboard/project/${PROJECT_REF}/settings/database"
  echo ""
  
  if supabase link --project-ref "$PROJECT_REF"; then
    echo ""
    echo "✅ Project linked successfully"
    echo "Pushing migrations..."
    supabase db push
  else
    echo ""
    echo "❌ Failed to link project"
    echo ""
    echo "Alternative: Apply migration via Supabase Dashboard SQL Editor:"
    echo "https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new"
    echo ""
    echo "Run this SQL:"
    cat "$MIGRATION_FILE"
    exit 1
  fi
fi

echo ""
echo "✅ Migration applied successfully!"
