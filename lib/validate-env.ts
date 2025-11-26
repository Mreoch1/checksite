/**
 * Environment variable validation
 * Ensures all required environment variables are present at startup
 */

import { z } from 'zod'

const envSchema = z.object({
  // Required for Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  
  // Required for Stripe
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().min(1),
  
  // Email (at least one required)
  SENDGRID_API_KEY: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  
  // Optional
  NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
  QUEUE_SECRET: z.string().optional(),
})

export function validateEnv() {
  try {
    envSchema.parse(process.env)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missing = error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      throw new Error(
        `Missing or invalid environment variables:\n${missing.join('\n')}\n\n` +
        `Please check your .env.local file or Netlify environment variables.`
      )
    }
    throw error
  }
  
  // Check that at least one email provider is configured
  if (!process.env.SENDGRID_API_KEY && !process.env.SMTP_PASSWORD) {
    throw new Error(
      'At least one email provider must be configured. Set either SENDGRID_API_KEY or SMTP_PASSWORD.'
    )
  }
}

// Validate on module load (only in production/server)
if (typeof window === 'undefined' && process.env.NODE_ENV === 'production') {
  try {
    validateEnv()
  } catch (error) {
    console.error('❌ Environment validation failed:', error)
    // Don't throw in production to avoid breaking builds
    // But log it so it's visible in logs
  }
}

