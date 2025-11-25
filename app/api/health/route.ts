/**
 * Health check endpoint
 * Used for monitoring and uptime checks
 */

import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const startTime = Date.now()
  const checks: Record<string, { status: 'ok' | 'error'; message?: string; duration?: number }> = {}
  
  // Check database connection
  try {
    const dbStart = Date.now()
    const { error } = await supabase.from('audits').select('id').limit(1)
    const dbDuration = Date.now() - dbStart
    checks.database = {
      status: error ? 'error' : 'ok',
      message: error ? error.message : 'Connected',
      duration: dbDuration,
    }
  } catch (error) {
    checks.database = {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }
  }
  
  // Check environment variables
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'STRIPE_SECRET_KEY',
  ]
  const missingEnvVars = requiredEnvVars.filter(key => !process.env[key])
  checks.environment = {
    status: missingEnvVars.length > 0 ? 'error' : 'ok',
    message: missingEnvVars.length > 0 
      ? `Missing: ${missingEnvVars.join(', ')}`
      : 'All required variables present',
  }
  
  const totalDuration = Date.now() - startTime
  const allHealthy = Object.values(checks).every(check => check.status === 'ok')
  
  return NextResponse.json(
    {
      status: allHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      checks,
      duration: totalDuration,
    },
    { status: allHealthy ? 200 : 503 }
  )
}

