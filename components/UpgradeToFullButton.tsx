'use client'

export default function UpgradeToFullButton({ auditId }: { auditId: string }) {
  return (
    <div className="bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl p-8 mb-8 text-center shadow-lg">
      <h2 className="text-2xl font-bold text-white mb-3">
        Want the Full Fix Plan?
      </h2>
      <p className="text-blue-100 text-lg mb-6 max-w-lg mx-auto">
        Your preview shows what issues exist. Upgrade to get complete fix instructions,
        detailed evidence, and a prioritized action checklist for just $14.99.
      </p>
      <button
        id="upgrade-to-full-btn"
        className="bg-white text-blue-600 px-8 py-4 rounded-lg font-bold text-lg hover:bg-blue-50 transition-all shadow-md hover:shadow-lg"
        onClick={async () => {
          const btn = document.getElementById('upgrade-to-full-btn') as HTMLButtonElement
          btn.disabled = true
          btn.textContent = 'Processing...'
          try {
            const res = await fetch('/api/upgrade-to-full', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ auditId }),
            })
            const data = await res.json()
            if (data.url) {
              window.location.href = data.url
            } else {
              alert('Something went wrong. Please try again.')
              btn.disabled = false
              btn.textContent = 'Get Full Report - $14.99'
            }
          } catch {
            alert('Connection error. Please try again.')
            btn.disabled = false
            btn.textContent = 'Get Full Report - $14.99'
          }
        }}
      >
        Get Full Report — $14.99
      </button>
      <p className="text-blue-200 text-sm mt-4">
        One-time payment. Full report delivered to your email and this page.
      </p>
    </div>
  )
}
