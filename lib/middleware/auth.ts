/**
 * Simple authentication middleware for admin routes
 * Uses a shared secret from environment variables
 */

import { NextRequest, NextResponse } from 'next/server'

const ADMIN_SECRET = process.env.ADMIN_SECRET || ''

export function requireAdminAuth(request: NextRequest): NextResponse | null {
  // If no secret is set, allow access (for development)
  if (!ADMIN_SECRET) {
    console.warn('⚠️  ADMIN_SECRET not set - admin routes are unprotected!')
    return null
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

