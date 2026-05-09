/**
 * Emails that receive paid-tier (full) report HTML without Stripe while checkout may still record $0.
 */
export const FREE_FULL_REPORT_EMAILS = ['mreoch82@hotmail.com'] as const

export function receivesComplimentaryFullReport(email: string | null | undefined): boolean {
  if (!email || typeof email !== 'string') return false
  const normalized = email.trim().toLowerCase()
  return FREE_FULL_REPORT_EMAILS.some((e) => e.toLowerCase() === normalized)
}
