'use client'

import { useEffect } from 'react'

interface PrintButtonProps {
  filename: string
}

export default function PrintButton({ filename }: PrintButtonProps) {
  useEffect(() => {
    // Set document title for print/save
    const originalTitle = document.title
    document.title = filename

    // Handle beforeprint to ensure filename is set
    const handleBeforePrint = () => {
      document.title = filename
    }

    // Handle afterprint to restore original title
    const handleAfterPrint = () => {
      document.title = originalTitle
    }

    window.addEventListener('beforeprint', handleBeforePrint)
    window.addEventListener('afterprint', handleAfterPrint)

    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint)
      window.removeEventListener('afterprint', handleAfterPrint)
      document.title = originalTitle
    }
  }, [filename])

  const handlePrint = () => {
    // Set title before printing (browsers use title as default filename)
    document.title = filename
    window.print()
  }

  const handleDownload = () => {
    // Create a downloadable HTML file with the report content
    const reportContent = document.querySelector('.prose')?.innerHTML || ''
    const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${filename}</title>
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
      line-height: 1.6; 
      color: #333; 
      max-width: 900px; 
      margin: 0 auto; 
      padding: 20px; 
    }
    @media print {
      body { padding: 0; }
    }
  </style>
</head>
<body>
  ${reportContent}
</body>
</html>`
    
    const blob = new Blob([fullHtml], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex gap-4 justify-center">
      <button
        onClick={handlePrint}
        className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
      >
        Print Report
      </button>
      <button
        onClick={handleDownload}
        className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-semibold"
      >
        Download PDF
      </button>
    </div>
  )
}

