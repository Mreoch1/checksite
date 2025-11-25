import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default async function ReportPage({ params }: { params: { id: string } }) {
  const { id } = params

  // Fetch audit from database
  const { data: audit, error } = await supabase
    .from('audits')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !audit) {
    notFound()
  }

  if (audit.status !== 'completed' || !audit.formatted_report_html) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Your report is still being generated...</p>
          <p className="text-sm text-gray-500 mt-2">We'll email you when it's ready.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div
          className="prose prose-lg max-w-none"
          dangerouslySetInnerHTML={{ __html: audit.formatted_report_html }}
        />
        <div className="mt-8 pt-8 border-t text-center">
          <button
            onClick={() => window.print()}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
          >
            Print Report
          </button>
        </div>
      </div>
    </div>
  )
}

