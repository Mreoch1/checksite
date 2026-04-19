/**
 * Supabase client initialization
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

// Client using anon key - for client-side or when RLS policies allow access
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Server-side client using service role key - bypasses RLS. Use only in API routes/server code.
let serviceClient: SupabaseClient | null = null

export function getSupabaseServiceClient(): SupabaseClient {
  if (serviceClient) return serviceClient
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL must be set for server-side database operations')
  }
  serviceClient = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  return serviceClient
}

// Database types (inferred from schema)
export interface Customer {
  id: string
  email: string
  name: string | null
  created_at: string
  marketing_consent_at?: string | null
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
  free_report_follow_up_sent_at?: string | null
  free_report_survey_invited_at?: string | null
}

export interface AuditModule {
  id: string
  audit_id: string
  module_key: string
  enabled: boolean
  raw_score: number | null
  raw_issues_json: any | null
}

