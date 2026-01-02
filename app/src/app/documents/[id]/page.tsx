import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, FileText, Clock, CheckCircle, Mail, ExternalLink, Copy } from 'lucide-react'

export default async function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/auth/login')
  }

  const { data: document } = await supabase
    .from('documents')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!document) {
    redirect('/dashboard')
  }

  const { data: signers } = await supabase
    .from('signers')
    .select('*')
    .eq('document_id', id)
    .order('created_at', { ascending: true })

  const { data: auditLogs } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('document_id', id)
    .order('created_at', { ascending: false })
    .limit(20)

  const statusColors = {
    draft: 'bg-gray-500/20 text-gray-400',
    pending: 'bg-yellow-500/20 text-yellow-400',
    completed: 'bg-green-500/20 text-green-400',
    expired: 'bg-red-500/20 text-red-400',
    declined: 'bg-red-500/20 text-red-400'
  }

  const signerStatusColors = {
    pending: 'bg-yellow-500/20 text-yellow-400',
    viewed: 'bg-blue-500/20 text-blue-400',
    signed: 'bg-green-500/20 text-green-400',
    declined: 'bg-red-500/20 text-red-400'
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

      <main className="relative mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Document Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-purple-400" />
              <h1 className="text-2xl font-bold text-white">{document.title}</h1>
            </div>
            <p className="mt-1 text-sm text-gray-400">
              Skapad {new Date(document.created_at).toLocaleDateString('sv-SE')}
            </p>
          </div>
          <span className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${statusColors[document.status as keyof typeof statusColors]}`}>
            {document.status === 'draft' && 'Utkast'}
            {document.status === 'pending' && 'Väntar på signering'}
            {document.status === 'completed' && 'Signerat'}
            {document.status === 'expired' && 'Utgånget'}
            {document.status === 'declined' && 'Avböjt'}
          </span>
        </div>

        {/* Actions */}
        {document.status === 'draft' && (
          <div className="mb-8 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
            <h2 className="text-lg font-medium mb-2">Nästa steg</h2>
            <p className="text-white/60 mb-4">
              Lägg till signaturfält och mottagare för att skicka dokumentet för signering.
            </p>
            <Link
              href={`/documents/${id}/edit`}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-2 font-medium text-white hover:opacity-90 transition"
            >
              Fortsätt redigera
              <ExternalLink className="h-4 w-4" />
            </Link>
          </div>
        )}

        {/* Signers */}
        {signers && signers.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-medium mb-4">Mottagare</h2>
            <div className="space-y-3">
              {signers.map((signer) => (
                <div
                  key={signer.id}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
                      <Mail className="h-5 w-5 text-white/60" />
                    </div>
                    <div>
                      <p className="font-medium">{signer.name || signer.email}</p>
                      <p className="text-sm text-white/50">{signer.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${signerStatusColors[signer.status as keyof typeof signerStatusColors]}`}>
                      {signer.status === 'pending' && 'Väntar'}
                      {signer.status === 'viewed' && 'Sett'}
                      {signer.status === 'signed' && 'Signerat'}
                      {signer.status === 'declined' && 'Avböjt'}
                    </span>
                    {signer.status === 'pending' && (
                      <button
                        className="flex items-center gap-1 text-sm text-purple-400 hover:text-purple-300 transition"
                        title="Kopiera signeringslänk"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Audit Log */}
        {auditLogs && auditLogs.length > 0 && (
          <div>
            <h2 className="text-lg font-medium mb-4">Aktivitetslogg</h2>
            <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden backdrop-blur-sm">
              <div className="divide-y divide-white/10">
                {auditLogs.map((log) => (
                  <div key={log.id} className="flex items-center gap-4 p-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10">
                      {log.action.includes('signed') ? (
                        <CheckCircle className="h-4 w-4 text-green-400" />
                      ) : (
                        <Clock className="h-4 w-4 text-white/50" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm">
                        {log.action === 'document_sent' && 'Dokument skickat för signering'}
                        {log.action === 'document_viewed' && 'Dokument visat'}
                        {log.action === 'document_signed' && 'Dokument signerat'}
                        {log.action === 'document_declined' && 'Signering avböjd'}
                      </p>
                      <p className="text-xs text-white/40">
                        {new Date(log.created_at).toLocaleString('sv-SE')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Download */}
        {document.status === 'completed' && (
          <div className="mt-8">
            <a
              href={document.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 px-6 py-3 font-medium text-white hover:opacity-90 transition"
            >
              <FileText className="h-5 w-5" />
              Ladda ner signerat dokument
            </a>
          </div>
        )}
      </main>
    </div>
  )
}
