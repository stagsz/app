'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Loader2, AlertTriangle, X } from 'lucide-react'

interface DeleteDocumentButtonProps {
  documentId: string
  documentTitle: string
}

export function DeleteDocumentButton({ documentId, documentTitle }: DeleteDocumentButtonProps) {
  const router = useRouter()
  const [showConfirm, setShowConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async () => {
    setDeleting(true)
    setError(null)

    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Kunde inte radera dokumentet')
        setDeleting(false)
        return
      }

      // Redirect to dashboard after successful deletion
      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      setError('Ett fel uppstod. Försök igen.')
      setDeleting(false)
    }
  }

  if (showConfirm) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#0A0A0B] p-6 shadow-xl">
          <button
            onClick={() => setShowConfirm(false)}
            className="absolute right-4 top-4 text-gray-400 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/20">
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
            <h3 className="text-lg font-semibold text-white">Radera dokument</h3>
          </div>

          <p className="text-gray-400 mb-2">
            Är du säker på att du vill radera dokumentet?
          </p>
          <p className="text-white font-medium mb-6">"{documentTitle}"</p>

          {error && (
            <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setShowConfirm(false)}
              disabled={deleting}
              className="flex-1 rounded-full border border-white/10 px-4 py-2 font-medium text-white hover:bg-white/5 transition disabled:opacity-50"
            >
              Avbryt
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex-1 flex items-center justify-center gap-2 rounded-full bg-red-500 px-4 py-2 font-medium text-white hover:bg-red-600 transition disabled:opacity-50"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Raderar...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Radera
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={() => setShowConfirm(true)}
      className="flex items-center gap-2 rounded-full border border-red-500/30 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/10 transition"
    >
      <Trash2 className="h-4 w-4" />
      Radera
    </button>
  )
}
