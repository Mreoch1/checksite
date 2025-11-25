/**
 * Request ID tracking for distributed tracing
 */

import { NextRequest } from 'next/server'

export function getRequestId(request: NextRequest): string {
  // Try to get existing request ID from header
  const existingId = request.headers.get('x-request-id') || 
                     request.headers.get('x-correlation-id') ||
                     request.headers.get('x-trace-id')
  
  if (existingId) {
    return existingId
  }
  
  // Generate new request ID
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

export function addRequestIdToLog(message: string, requestId: string): string {
  return `[${requestId}] ${message}`
}

