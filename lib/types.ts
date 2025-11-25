/**
 * Core type definitions for SiteCheck
 */

export type ModuleKey =
  | 'performance'
  | 'crawl_health'
  | 'on_page'
  | 'mobile'
  | 'local'
  | 'accessibility'
  | 'security'
  | 'schema'
  | 'social'
  | 'competitor_overview'

export type AuditStatus = 'pending' | 'running' | 'completed' | 'failed'

export type IssueSeverity = 'high' | 'medium' | 'low'

export interface AuditIssue {
  title: string
  severity: IssueSeverity
  technicalExplanation: string
  plainLanguageExplanation: string
  suggestedFix: string
  evidence?: {
    // Actual values found (e.g., actual title tag, robots.txt content, etc.)
    found?: string | string[]
    expected?: string
    actual?: string
    count?: number
    details?: Record<string, any>
  }
}

export interface ModuleResult {
  moduleKey: ModuleKey
  score: number // 0-100
  issues: AuditIssue[]
  summary: string // Plain language summary
  evidence?: {
    // Module-level evidence (e.g., page title, meta description, H1 text, etc.)
    [key: string]: any
  }
}

export interface AuditResult {
  url: string
  modules: ModuleResult[]
  overallScore: number // Average of module scores
}

export interface ModuleRecommendation {
  moduleKey: ModuleKey
  recommended: boolean
  reason?: string
}

export interface PricingConfig {
  basePrice: number // in cents
  modules: Record<ModuleKey, number> // Additional cost in cents
}

export const PRICING_CONFIG: PricingConfig = {
  basePrice: 1999, // $19.99
  modules: {
    performance: 0, // Included in base
    crawl_health: 0, // Included in base
    on_page: 0, // Included in base
    mobile: 0, // Included in base
    local: 1000, // +$10.00
    accessibility: 1000, // +$10.00
    security: 500, // +$5.00
    schema: 1000, // +$10.00
    social: 500, // +$5.00
    competitor_overview: 1500, // +$15.00
  },
}

export const CORE_MODULES: ModuleKey[] = [
  'performance',
  'crawl_health',
  'on_page',
  'mobile',
]

export const MODULE_DISPLAY_NAMES: Record<ModuleKey, string> = {
  performance: 'Performance',
  crawl_health: 'Crawl Health',
  on_page: 'On-Page SEO',
  mobile: 'Mobile Optimization',
  local: 'Local SEO',
  accessibility: 'Accessibility',
  security: 'Security',
  schema: 'Schema Markup',
  social: 'Social Metadata',
  competitor_overview: 'Competitor Overview',
}

export const MODULE_DESCRIPTIONS: Record<ModuleKey, string> = {
  performance: 'Checks how fast your website loads and performs for visitors.',
  crawl_health: 'Verifies search engines can find and index all your pages.',
  on_page: 'Reviews titles, descriptions, headings, and content quality.',
  mobile: 'Ensures your site works perfectly on phones and tablets.',
  local: 'Checks if your address, phone number, and Google Business profile are set up correctly.',
  accessibility: 'Makes sure your site is usable by everyone, including people with disabilities.',
  security: 'Verifies your site uses secure connections and protects visitor data.',
  schema: 'Checks if your business information is properly structured for search engines.',
  social: 'Ensures your site looks great when shared on Facebook, Twitter, and other platforms.',
  competitor_overview: 'Compares your site against competitors to find opportunities.',
}

