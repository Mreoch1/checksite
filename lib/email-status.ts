/**
 * Helper functions for checking email_sent_at status
 * Since email_sent_at is a timestamp column, we use time-based logic instead of string prefixes
 */

/**
 * Check if email_sent_at represents a reservation (recent timestamp) or a real sent email
 * Reservations are timestamps within the last 5 minutes (another process is sending)
 * Real sent emails are timestamps older than 5 minutes
 */
export function isEmailReservation(emailSentAt: string | null | undefined): boolean {
  if (!emailSentAt || emailSentAt === 'null') {
    return false
  }
  
  try {
    const sentTime = new Date(emailSentAt).getTime()
    if (isNaN(sentTime)) {
      return false // Invalid timestamp
    }
    
    const now = Date.now()
    const age = now - sentTime
    // If timestamp is within last 5 minutes, it's a reservation
    // If older, it's a real sent email
    return age < 5 * 60 * 1000 // 5 minutes
  } catch {
    return false
  }
}

/**
 * Check if email was actually sent (not a reservation)
 */
export function isEmailSent(emailSentAt: string | null | undefined): boolean {
  if (!emailSentAt || emailSentAt === 'null') {
    return false
  }
  
  try {
    const sentTime = new Date(emailSentAt).getTime()
    if (isNaN(sentTime)) {
      return false // Invalid timestamp
    }
    
    const now = Date.now()
    const age = now - sentTime
    // If timestamp is older than 5 minutes, it's a real sent email
    return age >= 5 * 60 * 1000 // 5 minutes
  } catch {
    return false
  }
}

/**
 * Check if email sending is in progress (reservation exists)
 */
export function isEmailSending(emailSentAt: string | null | undefined): boolean {
  return isEmailReservation(emailSentAt)
}

