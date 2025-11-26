/**
 * Input validation utilities using Zod
 */

import { z } from 'zod'

// URL validation schema
export const urlSchema = z.string().url().or(
  z.string().refine(
    (val) => {
      // Allow URLs without protocol (will be normalized)
      try {
        new URL(`https://${val}`)
        return true
      } catch {
        return false
      }
    },
    { message: 'Invalid URL format' }
  )
)

// Email validation schema
export const emailSchema = z.string().email({ message: 'Invalid email address' })

// Audit creation schema
export const createAuditSchema = z.object({
  url: urlSchema,
  email: emailSchema,
  name: z.string().optional(),
  modules: z.array(z.enum([
    'performance',
    'crawl_health',
    'on_page',
    'mobile',
    'local',
    'accessibility',
    'security',
    'schema',
    'social',
    'competitor_overview',
  ])).min(1, 'At least one module must be selected'),
  competitorUrl: z.string().url().optional().or(
    z.string().refine(
      (val) => {
        if (!val || val.trim() === '') return true // Optional
        try {
          new URL(val.startsWith('http') ? val : `https://${val}`)
          return true
        } catch {
          return false
        }
      },
      { message: 'Invalid competitor URL format' }
    )
  ),
}).refine(
  (data) => {
    // If competitor_overview is selected, competitorUrl must be provided
    if (data.modules.includes('competitor_overview')) {
      return data.competitorUrl && data.competitorUrl.trim() !== ''
    }
    return true
  },
  {
    message: 'Competitor URL is required when Competitor Overview is selected',
    path: ['competitorUrl'],
  }
)

// Test audit schema
export const testAuditSchema = z.object({
  url: urlSchema.optional().default('https://seoauditpro.net'),
  email: emailSchema.optional().default('test@example.com'),
  modules: z.array(z.string()).optional(),
})

// Retry audit schema
export const retryAuditSchema = z.object({
  auditId: z.string().uuid('Invalid audit ID format'),
})

// Recommend modules schema
export const recommendModulesSchema = z.object({
  url: urlSchema,
})

