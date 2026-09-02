import { useState } from 'react'
import { toast } from 'sonner'
import { getStlPathFromUrl, getStlSignedUrl } from '../../lib/stlFiles'

export function StlViewButton({ url }: { url: string }) {
  const [loading, setLoading] = useState(false)

  const handleView = async () => {
    setLoading(true)
    try {
      const filePath = getStlPathFromUrl(url)
      const signedUrl = await getStlSignedUrl(filePath)
      if (!signedUrl) {
        toast.error('Failed to generate download link')
        return
      }
      window.open(signedUrl, '_blank')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={() => void handleView()}
      disabled={loading}
      className="inline-flex cursor-pointer items-center gap-1.5 rounded-[9px] border border-orange-400/30 bg-orange-400/[0.08] px-3 py-1.5 text-[11px] font-semibold text-orange-300 transition hover:bg-orange-400/[0.16] disabled:opacity-50"
    >
      {loading && <span className="h-3 w-3 animate-spin rounded-full border border-orange-300 border-t-transparent" />}
      View STL
    </button>
  )
}
