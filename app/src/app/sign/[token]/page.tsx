'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { FileSignature, CheckCircle, Loader2, AlertCircle } from 'lucide-react'
import { PDFViewer } from '@/components/PDFViewer'
import { SignatureCapture } from '@/components/SignatureCapture'

interface SignerData {
  id: string
  name: string
  email: string
  status: string
  document: {
    id: string
    title: string
    file_url: string
  }
  fields: {
    id: string
    type: 'signature' | 'initial' | 'date' | 'text'
    page: number
    x: number
    y: number
    width: number
    height: number
    value: string | null
  }[]
}

export default function SigningPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [signer, setSigner] = useState<SignerData | null>(null)
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({})
  const [activeField, setActiveField] = useState<{ id: string; type: 'signature' | 'initial' } | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [completed, setCompleted] = useState(false)

  useEffect(() => {
    const loadSigningData = async () => {
      try {
        const response = await fetch(`/api/sign/${token}`)
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Kunde inte ladda dokumentet')
        }

        setSigner(data)

        // Pre-fill date fields with current date
        const dateValues: Record<string, string> = {}
        data.fields.forEach((field: { id: string; type: string }) => {
          if (field.type === 'date') {
            dateValues[field.id] = new Date().toLocaleDateString('sv-SE')
          }
        })
        setFieldValues(dateValues)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Något gick fel')
      } finally {
        setLoading(false)
      }
    }

    loadSigningData()
  }, [token])

  const handleFieldClick = (fieldId: string, fieldType: string) => {
    if (fieldType === 'signature' || fieldType === 'initial') {
      setActiveField({ id: fieldId, type: fieldType })
    }
  }

  const handleSignatureSave = (signatureData: string) => {
    if (activeField) {
      setFieldValues(prev => ({ ...prev, [activeField.id]: signatureData }))
      setActiveField(null)
    }
  }

  const handleSubmit = async () => {
    if (!signer) return

    // Check all required fields are filled
    const missingFields = signer.fields.filter(
      f => !fieldValues[f.id] && f.type !== 'text'
    )

    if (missingFields.length > 0) {
      setError('Vänligen fyll i alla obligatoriska fält')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch(`/api/sign/${token}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fieldValues })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Kunde inte spara signaturen')
      }

      setCompleted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Något gick fel')
      setSubmitting(false)
    }
  }

  const allFieldsFilled = signer?.fields.every(
    f => fieldValues[f.id] || f.type === 'text'
  )

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0B]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
          <p className="text-white/60">Laddar dokument...</p>
        </div>
      </div>
    )
  }

  if (error && !signer) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0B]">
        <div className="pointer-events-none fixed top-0 left-1/4 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-purple-500/20 blur-[120px]" />
        <div className="pointer-events-none fixed top-20 right-1/4 h-[400px] w-[400px] translate-x-1/2 rounded-full bg-blue-500/20 blur-[120px]" />
        <div className="relative text-center max-w-md px-4">
          <AlertCircle className="mx-auto h-12 w-12 text-red-400 mb-4" />
          <h1 className="text-xl font-semibold text-white mb-2">Kunde inte ladda dokumentet</h1>
          <p className="text-white/60">{error}</p>
        </div>
      </div>
    )
  }

  if (completed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0B]">
        <div className="pointer-events-none fixed top-0 left-1/4 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-purple-500/20 blur-[120px]" />
        <div className="pointer-events-none fixed top-20 right-1/4 h-[400px] w-[400px] translate-x-1/2 rounded-full bg-blue-500/20 blur-[120px]" />
        <div className="relative text-center max-w-md px-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20 mb-6">
            <CheckCircle className="h-8 w-8 text-green-400" />
          </div>
          <h1 className="text-2xl font-semibold text-white mb-2">Tack för din signatur!</h1>
          <p className="text-white/60 mb-6">
            Dokumentet har signerats. Du kommer att få en kopia via e-post.
          </p>
          <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/60">
            <FileSignature className="h-4 w-4" />
            {signer?.document.title}
          </div>
        </div>
      </div>
    )
  }

  if (signer?.status === 'signed') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0B]">
        <div className="pointer-events-none fixed top-0 left-1/4 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-purple-500/20 blur-[120px]" />
        <div className="pointer-events-none fixed top-20 right-1/4 h-[400px] w-[400px] translate-x-1/2 rounded-full bg-blue-500/20 blur-[120px]" />
        <div className="relative text-center max-w-md px-4">
          <CheckCircle className="mx-auto h-12 w-12 text-green-400 mb-4" />
          <h1 className="text-xl font-semibold text-white mb-2">Redan signerat</h1>
          <p className="text-white/60">Du har redan signerat detta dokument.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white">
      {/* Gradient orbs */}
      <div className="pointer-events-none fixed top-0 left-1/4 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-purple-500/20 blur-[120px]" />
      <div className="pointer-events-none fixed top-20 right-1/4 h-[400px] w-[400px] translate-x-1/2 rounded-full bg-blue-500/20 blur-[120px]" />

      {/* Header */}
      <header className="relative border-b border-white/10 bg-[#0A0A0B]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <span className="text-lg font-semibold tracking-tight">SimpleSign</span>
          <div className="text-sm text-white/60">
            Signerar som: <span className="text-white">{signer?.name || signer?.email}</span>
          </div>
        </div>
      </header>

      <div className="relative flex h-[calc(100vh-4rem)]">
        {/* Sidebar */}
        <div className="w-80 border-r border-white/10 overflow-y-auto p-4 bg-[#0A0A0B]/50 backdrop-blur-sm">
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-1">{signer?.document.title}</h2>
            <p className="text-sm text-white/60">
              Granska dokumentet och signera på markerade ställen.
            </p>
          </div>

          {/* Field Checklist */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-white/50 mb-3">Fält att fylla i</h3>
            {signer?.fields.map(field => {
              const isFilled = !!fieldValues[field.id]
              const fieldLabel = field.type === 'signature' ? 'Signatur' :
                field.type === 'initial' ? 'Initial' :
                field.type === 'date' ? 'Datum' : 'Text'

              return (
                <button
                  key={field.id}
                  onClick={() => handleFieldClick(field.id, field.type)}
                  className={`w-full flex items-center gap-3 rounded-xl border p-3 text-left transition ${
                    isFilled
                      ? 'border-green-500/50 bg-green-500/10'
                      : 'border-white/10 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <div className={`flex h-6 w-6 items-center justify-center rounded-full ${
                    isFilled ? 'bg-green-500' : 'bg-white/10'
                  }`}>
                    {isFilled ? (
                      <CheckCircle className="h-4 w-4 text-white" />
                    ) : (
                      <span className="text-xs text-white/50">{field.page}</span>
                    )}
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${isFilled ? 'text-green-400' : 'text-white'}`}>
                      {fieldLabel}
                    </p>
                    <p className="text-xs text-white/40">Sida {field.page}</p>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Submit Button */}
          <div className="mt-6">
            {error && (
              <div className="mb-4 rounded-xl bg-red-500/10 border border-red-500/20 p-3">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={!allFieldsFilled || submitting}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-3 font-medium text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Sparar signatur...
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5" />
                  Signera dokument
                </>
              )}
            </button>

            {!allFieldsFilled && (
              <p className="mt-2 text-center text-xs text-white/40">
                Fyll i alla fält för att kunna signera
              </p>
            )}
          </div>
        </div>

        {/* PDF Viewer */}
        <div className="flex-1 overflow-hidden p-4">
          {signer && (
            <PDFViewer
              url={`/api/sign/${token}/file`}
              onPageChange={(page) => setCurrentPage(page)}
              renderOverlay={(page, scale) => (
                <div className="absolute inset-0">
                  {signer.fields
                    .filter(f => f.page === page)
                    .map(field => {
                      const value = fieldValues[field.id]

                      return (
                        <button
                          key={field.id}
                          onClick={() => handleFieldClick(field.id, field.type)}
                          className={`absolute flex items-center justify-center rounded border-2 transition-all ${
                            value
                              ? 'border-green-500 bg-green-500/10'
                              : 'border-purple-500 bg-purple-500/20 hover:bg-purple-500/30 animate-pulse'
                          }`}
                          style={{
                            left: field.x * scale,
                            top: field.y * scale,
                            width: field.width * scale,
                            height: field.height * scale
                          }}
                        >
                          {value ? (
                            field.type === 'date' ? (
                              <span className="text-sm text-gray-800 font-medium">{value}</span>
                            ) : (
                              <img
                                src={value}
                                alt="Signature"
                                className="max-w-full max-h-full object-contain"
                              />
                            )
                          ) : (
                            <span className="text-xs text-purple-300 font-medium">
                              {field.type === 'signature' ? 'Klicka för att signera' :
                               field.type === 'initial' ? 'Initialer' :
                               field.type === 'date' ? 'Datum' : 'Text'}
                            </span>
                          )}
                        </button>
                      )
                    })}
                </div>
              )}
            />
          )}
        </div>
      </div>

      {/* Signature Capture Modal */}
      {activeField && (
        <SignatureCapture
          type={activeField.type}
          onSave={handleSignatureSave}
          onCancel={() => setActiveField(null)}
        />
      )}
    </div>
  )
}
