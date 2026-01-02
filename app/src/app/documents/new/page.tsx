'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { PDFDropzone } from '@/components/PDFDropzone'

export default function NewDocumentPage() {
  const router = useRouter()
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleUpload = async (file: File) => {
    setIsUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('title', file.name.replace('.pdf', ''))

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Något gick fel')
      }

      // Redirect to document editor
      router.push(`/documents/${data.document.id}/edit`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunde inte ladda upp filen')
      setIsUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white">
      {/* Gradient orbs */}
      <div className="pointer-events-none fixed top-0 left-1/4 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-purple-500/20 blur-[120px]" />
      <div className="pointer-events-none fixed top-20 right-1/4 h-[400px] w-[400px] translate-x-1/2 rounded-full bg-blue-500/20 blur-[120px]" />

      {/* Header */}
      <header className="relative border-b border-white/10 bg-[#0A0A0B]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-white/60 hover:text-white transition"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="text-sm">Tillbaka</span>
            </Link>
            <div className="h-6 w-px bg-white/10" />
            <Link href="/" className="text-lg font-semibold tracking-tight">
              SimpleSign
            </Link>
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">Ladda upp dokument</h1>
          <p className="mt-2 text-white/60">
            Ladda upp en PDF som du vill skicka för signering
          </p>
        </div>

        <PDFDropzone onUpload={handleUpload} isUploading={isUploading} />

        {error && (
          <div className="mt-6 rounded-2xl bg-red-500/10 border border-red-500/20 p-4">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
          <h3 className="font-medium mb-3">Hur det fungerar</h3>
          <ol className="space-y-3 text-sm text-white/60">
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 text-purple-400 text-xs font-medium">1</span>
              <span>Ladda upp din PDF-fil</span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 text-purple-400 text-xs font-medium">2</span>
              <span>Lägg till signaturfält där mottagaren ska signera</span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 text-purple-400 text-xs font-medium">3</span>
              <span>Ange mottagarens e-post och skicka</span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 text-purple-400 text-xs font-medium">4</span>
              <span>Mottagaren signerar direkt i webbläsaren</span>
            </li>
          </ol>
        </div>
      </main>
    </div>
  )
}
