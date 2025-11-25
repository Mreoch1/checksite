/**
 * Simple authentication middleware for admin routes
 * Uses a shared secret from environment variables
 */

import { NextRequest, NextResponse } from 'next/server'

const ADMIN_SECRET = process.env.ADMIN_SECRET || ''

export function requireAdminAuth(request: NextRequest): NextResponse | null {
  // Always require auth in production
  const isProduction = process.env.NODE_ENV === 'production' || process.env.NETLIFY === 'true'
  
  if (!ADMIN_SECRET) {
    if (isProduction) {
      // In production, block if no secret is set
      console.error('❌ ADMIN_SECRET not set in production - blocking admin access')
      return NextResponse.json(
        { error: 'Admin authentication not configured' },
        { status: 503 }
      )
    } else {
      // In development, warn but allow
      console.warn('⚠️  ADMIN_SECRET not set - admin routes are unprotected!')
      return null
    }
  }
  
  const authHeader = request.headers.get('authorization')
  
  if (!authHeader || authHeader !== `Bearer ${ADMIN_SECRET}`) {
    return NextResponse.json(
      { error: 'Unauthorized - Admin access required' },
      { status: 401 }
    )
  }
  
  return null // Authorized
}

