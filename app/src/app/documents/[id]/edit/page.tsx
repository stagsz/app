'use client'

import { useState, useEffect, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FileSignature, ArrowLeft, Send, Pen, Type, Calendar, Plus, Trash2, Loader2 } from 'lucide-react'
import { PDFViewer } from '@/components/PDFViewer'
import { SignatureFieldOverlay, SignatureField, FieldType } from '@/components/SignatureFieldOverlay'
import { createClient } from '@/lib/supabase/client'

interface Signer {
  id: string
  email: string
  name: string
}

const fieldTools: { type: FieldType; icon: typeof Pen; label: string }[] = [
  { type: 'signature', icon: Pen, label: 'Signatur' },
  { type: 'initial', icon: Type, label: 'Initial' },
  { type: 'date', icon: Calendar, label: 'Datum' }
]

export default function DocumentEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const supabase = createClient()

  const [document, setDocument] = useState<{ id: string; title: string; file_url: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [signers, setSigners] = useState<Signer[]>([])
  const [newSignerEmail, setNewSignerEmail] = useState('')
  const [newSignerName, setNewSignerName] = useState('')

  const [fields, setFields] = useState<SignatureField[]>([])
  const [activeFieldType, setActiveFieldType] = useState<FieldType | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState({ width: 612, height: 792 })
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const loadDocument = async () => {
      const { data, error } = await supabase
        .from('documents')
        .select('id, title, file_url')
        .eq('id', id)
        .single()

      if (error || !data) {
        setError('Dokumentet hittades inte')
      } else {
        setDocument(data)
      }
      setLoading(false)
    }

    loadDocument()
  }, [id, supabase])

  const addSigner = () => {
    if (!newSignerEmail.trim()) return

    const signer: Signer = {
      id: crypto.randomUUID(),
      email: newSignerEmail.trim(),
      name: newSignerName.trim() || newSignerEmail.split('@')[0]
    }

    setSigners(prev => [...prev, signer])
    setNewSignerEmail('')
    setNewSignerName('')
  }

  const removeSigner = (signerId: string) => {
    setSigners(prev => prev.filter(s => s.id !== signerId))
    setFields(prev => prev.filter(f => f.signerId !== signerId))
  }

  const handleFieldAdd = useCallback((field: Omit<SignatureField, 'id'>) => {
    if (signers.length === 0) {
      setError('Lägg till minst en mottagare först')
      return
    }

    const newField: SignatureField = {
      ...field,
      id: crypto.randomUUID(),
      signerId: signers[0].id
    }
    setFields(prev => [...prev, newField])
    setActiveFieldType(null)
  }, [signers])

  const handleFieldUpdate = useCallback((fieldId: string, updates: Partial<SignatureField>) => {
    setFields(prev => prev.map(f => f.id === fieldId ? { ...f, ...updates } : f))
  }, [])

  const handleFieldDelete = useCallback((fieldId: string) => {
    setFields(prev => prev.filter(f => f.id !== fieldId))
  }, [])

  const handleSend = async () => {
    if (signers.length === 0) {
      setError('Lägg till minst en mottagare')
      return
    }

    if (fields.length === 0) {
      setError('Lägg till minst ett signaturfält')
      return
    }

    setSending(true)
    setError(null)

    try {
      // Clean the data to ensure it's serializable
      const cleanSigners = signers.map(s => ({
        id: s.id,
        email: s.email,
        name: s.name
      }))

      const cleanFields = fields.map(f => ({
        id: f.id,
        type: f.type,
        x: f.x,
        y: f.y,
        width: f.width,
        height: f.height,
        page: f.page,
        signerId: f.signerId
      }))

      const response = await fetch(`/api/documents/${id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signers: cleanSigners, fields: cleanFields })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Kunde inte skicka dokumentet')
      }

      router.push(`/documents/${id}`)
    } catch (err) {
      console.error('Send error:', err)
      setError(err instanceof Error ? err.message : 'Något gick fel')
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0B]">
        <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
      </div>
    )
  }

  if (error && !document) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0B]">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <Link href="/dashboard" className="text-purple-400 hover:underline">
            Tillbaka till dashboard
          </Link>
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
        <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-white/60 hover:text-white transition"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="h-6 w-px bg-white/10" />
            <span className="font-semibold truncate max-w-[200px]">
              {document?.title}
            </span>
          </div>

          <button
            onClick={handleSend}
            disabled={sending || signers.length === 0 || fields.length === 0}
            className="flex items-center gap-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-2 font-medium text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Skickar...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Skicka för signering
              </>
            )}
          </button>
        </div>
      </header>

      <div className="relative flex h-[calc(100vh-4rem)]">
        {/* Sidebar */}
        <div className="w-80 border-r border-white/10 overflow-y-auto p-4 bg-[#0A0A0B]/50 backdrop-blur-sm">
          {/* Signers */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-white/50 mb-3">Mottagare</h3>

            {signers.length === 0 ? (
              <p className="text-sm text-white/40 mb-3">Inga mottagare tillagda</p>
            ) : (
              <div className="space-y-2 mb-3">
                {signers.map(signer => (
                  <div
                    key={signer.id}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{signer.name}</p>
                      <p className="text-xs text-white/50 truncate">{signer.email}</p>
                    </div>
                    <button
                      onClick={() => removeSigner(signer.id)}
                      className="p-1 text-white/40 hover:text-red-400 transition"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2">
              <input
                type="email"
                value={newSignerEmail}
                onChange={(e) => setNewSignerEmail(e.target.value)}
                placeholder="E-postadress"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/40 focus:border-purple-500 focus:outline-none transition"
              />
              <input
                type="text"
                value={newSignerName}
                onChange={(e) => setNewSignerName(e.target.value)}
                placeholder="Namn (valfritt)"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/40 focus:border-purple-500 focus:outline-none transition"
              />
              <button
                onClick={addSigner}
                disabled={!newSignerEmail.trim()}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <Plus className="h-4 w-4" />
                Lägg till mottagare
              </button>
            </div>
          </div>

          {/* Field Tools */}
          <div>
            <h3 className="text-sm font-medium text-white/50 mb-3">Fält att placera</h3>

            <div className="space-y-2">
              {fieldTools.map(tool => {
                const Icon = tool.icon
                const isActive = activeFieldType === tool.type

                return (
                  <button
                    key={tool.type}
                    onClick={() => setActiveFieldType(isActive ? null : tool.type)}
                    disabled={signers.length === 0}
                    className={`
                      w-full flex items-center gap-3 rounded-xl border px-3 py-2 text-sm transition
                      disabled:opacity-50 disabled:cursor-not-allowed
                      ${isActive
                        ? 'border-purple-500 bg-purple-500/20 text-white'
                        : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
                      }
                    `}
                  >
                    <Icon className="h-4 w-4" />
                    {tool.label}
                    {isActive && (
                      <span className="ml-auto text-xs text-purple-400">
                        Klicka på dokumentet
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {signers.length === 0 && (
              <p className="mt-2 text-xs text-white/40">
                Lägg till en mottagare först
              </p>
            )}
          </div>

          {/* Field Summary */}
          {fields.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-white/50 mb-3">
                Placerade fält ({fields.length})
              </h3>
              <div className="space-y-1">
                {fields.map(field => (
                  <div
                    key={field.id}
                    className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2 text-sm"
                  >
                    <span className="text-white/70">
                      {field.type === 'signature' ? 'Signatur' : field.type === 'initial' ? 'Initial' : 'Datum'}
                      <span className="text-white/40 ml-1">s.{field.page}</span>
                    </span>
                    <button
                      onClick={() => handleFieldDelete(field.id)}
                      className="text-white/40 hover:text-red-400 transition"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-4 rounded-xl bg-red-500/10 border border-red-500/20 p-3">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}
        </div>

        {/* PDF Viewer */}
        <div className="flex-1 overflow-hidden p-4">
          {document && (
            <PDFViewer
              url={`/api/documents/${id}/file`}
              onPageChange={(page) => setCurrentPage(page)}
              onDocumentLoad={() => {}}
              renderOverlay={(page, s) => (
                <SignatureFieldOverlay
                  fields={fields}
                  currentPage={page}
                  scale={s}
                  onFieldAdd={handleFieldAdd}
                  onFieldUpdate={handleFieldUpdate}
                  onFieldDelete={handleFieldDelete}
                  activeFieldType={activeFieldType}
                  containerWidth={pageSize.width * s}
                  containerHeight={pageSize.height * s}
                />
              )}
            />
          )}
        </div>
      </div>
    </div>
  )
}
