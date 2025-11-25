import { Suspense } from 'react'
import SuccessClient from './SuccessClient'

export default function SuccessPage() {
  return (
    <Suspense
      fallback={
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center py-12">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
              <div className="animate-pulse">
                <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4"></div>
                <div className="h-8 bg-gray-200 rounded w-64 mx-auto mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-48 mx-auto"></div>
              </div>
          </div>
          </div>
        </div>
      }
    >
      <SuccessClient />
    </Suspense>
  )
}

