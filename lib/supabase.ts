/**
 * Supabase client initialization
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

// Create client - will work with placeholder values at build time
// Real values required at runtime
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types (inferred from schema)
export interface Customer {
  id: string
  email: string
  name: string | null
  created_at: string
}

export interface Audit {
  id: string
  customer_id: string
  url: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  total_price_cents: number
  created_at: string
  completed_at: string | null
  raw_result_json: any | null
  formatted_report_html: string | null
  formatted_report_plaintext: string | null
}

export interface AuditModule {
  id: string
  audit_id: string
  module_key: string
  enabled: boolean
  raw_score: number | null
  raw_issues_json: any | null
}

