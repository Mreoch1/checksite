'use client'

import { useEffect, useRef } from 'react'
import { trackFunnelEvent } from '@/lib/funnel-tracker'

type Props = {
  auditId: string
  siteUrl: string
}

export default function ReportFunnelTracker({ auditId, siteUrl }: Props) {
  const fired = useRef(false)

  useEffect(() => {
    if (fired.current) return
    fired.current = true
    trackFunnelEvent('report_viewed', { auditId, url: siteUrl })
  }, [auditId, siteUrl])

  return null
}
