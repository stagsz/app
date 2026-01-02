import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Plus, FileText, Clock, CheckCircle } from 'lucide-react'

export default async function DashboardPage() {
  // Check if Supabase is configured
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0B]">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">Supabase Not Configured</h1>
          <p className="mt-2 text-white/60">
            Add your Supabase credentials to <code className="bg-white/10 px-2 py-1 rounded">.env.local</code>
          </p>
          <Link href="/" className="mt-4 inline-block text-purple-400 hover:underline">
            Back to home
          </Link>
        </div>
      </div>
    )
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Get user's documents (placeholder - will be empty initially)
  const { data: documents } = await supabase
    .from('documents')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10)

  const stats = {
    total: documents?.length ?? 0,
    pending: documents?.filter(d => d.status === 'pending').length ?? 0,
    completed: documents?.filter(d => d.status === 'completed').length ?? 0,
  }

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white">
      {/* Gradient orbs */}
      <div className="pointer-events-none fixed top-0 left-1/4 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-purple-500/20 blur-[120px]" />
      <div className="pointer-events-none fixed top-20 right-1/4 h-[400px] w-[400px] translate-x-1/2 rounded-full bg-blue-500/20 blur-[120px]" />

      {/* Header */}
      <header className="relative border-b border-white/10 bg-[#0A0A0B]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            SimpleSign
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-white/60">{user.email}</span>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="text-sm text-white/60 hover:text-white transition"
              >
                Logga ut
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                <FileText className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-white/50">Totalt</p>
                <p className="text-2xl font-semibold">{stats.total}</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20">
                <Clock className="h-5 w-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-white/50">Väntar</p>
                <p className="text-2xl font-semibold">{stats.pending}</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20">
                <CheckCircle className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <p className="text-sm text-white/50">Klara</p>
                <p className="text-2xl font-semibold">{stats.completed}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Documents */}
        <div className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Senaste dokument</h2>
            <Link
              href="/documents/new"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              Nytt dokument
            </Link>
          </div>

          {documents && documents.length > 0 ? (
            <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
              <table className="min-w-full divide-y divide-white/10">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/50">
                      Dokument
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/50">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/50">
                      Skapad
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-white/50">

                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {documents.map((doc) => (
                    <tr key={doc.id} className="transition hover:bg-white/5">
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-white/40" />
                          <span className="font-medium">{doc.title}</span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                            doc.status === 'completed'
                              ? 'bg-green-500/20 text-green-400'
                              : doc.status === 'pending'
                              ? 'bg-yellow-500/20 text-yellow-400'
                              : 'bg-white/10 text-white/60'
                          }`}
                        >
                          {doc.status === 'completed' ? 'Klar' : doc.status === 'pending' ? 'Väntar' : 'Utkast'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-white/50">
                        {new Date(doc.created_at).toLocaleDateString('sv-SE')}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                        <Link
                          href={`/documents/${doc.id}`}
                          className="text-purple-400 hover:text-purple-300 transition"
                        >
                          Visa
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-12 text-center backdrop-blur-sm">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                <FileText className="h-8 w-8 text-purple-400" />
              </div>
              <h3 className="mt-4 text-lg font-medium">Inga dokument ännu</h3>
              <p className="mt-2 text-white/50">
                Kom igång genom att ladda upp ditt första dokument för signering.
              </p>
              <Link
                href="/documents/new"
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-3 text-sm font-medium text-white transition hover:opacity-90"
              >
                <Plus className="h-4 w-4" />
                Ladda upp dokument
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
