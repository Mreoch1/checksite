import { Inngest } from 'inngest'

// Initialize Inngest client
// Environment variables are optional - Inngest will use defaults if not set
export const inngest = new Inngest({ 
  id: process.env.INNGEST_APP_ID || 'seo-checksite',
  name: 'SEO CheckSite',
  eventKey: process.env.INNGEST_EVENT_KEY,
  signingKey: process.env.INNGEST_SIGNING_KEY,
})

// Event types
export const events = {
  'audit/process': {
    name: 'audit/process',
    data: {
      auditId: '',
    },
  },
} as const

