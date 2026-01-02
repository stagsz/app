'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { AlertCircle } from 'lucide-react'
import { Suspense } from 'react'

function FailureContent() {
  const searchParams = useSearchParams()
  const plan = searchParams.get('plan')
  const reason = searchParams.get('reason')

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0A0A0B]">
      <div className="pointer-events-none fixed top-0 left-1/4 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-red-500/20 blur-[120px]" />

      <div className="relative max-w-md text-center">
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 backdrop-blur-sm p-8">
          <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-6" />

          <h1 className="text-2xl font-bold text-white mb-2">Betalningen misslyckades</h1>

          <p className="text-white/60 mb-8">
            {reason
              ? `Fel: ${reason}`
              : 'Det uppstod ett fel när vi behandlade din betalning. Ingen summa har debiterats.'}
          </p>

          <div className="rounded-lg border border-white/10 bg-white/5 p-4 mb-8 text-left">
            <h3 className="text-sm font-medium text-white mb-3">Du kan försöka:</h3>
            <ul className="text-sm text-white/60 space-y-2">
              <li>• Kontrollera att dina betalningsuppgifter är korrekta</li>
              <li>• Prova en annan betalningsmetod</li>
              <li>• Försök igen senare</li>
              <li>• Kontakta din bank</li>
            </ul>
          </div>

          <div className="flex flex-col gap-3">
            <Link
              href={plan ? `/checkout?plan=${plan}` : '/pricing'}
              className="block w-full py-3 px-4 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium hover:opacity-90 transition"
            >
              Försök igen
            </Link>

            <Link
              href="/dashboard"
              className="block w-full py-3 px-4 rounded-lg border border-white/20 text-white font-medium hover:bg-white/10 transition"
            >
              Tillbaka till dashboard
            </Link>

            <a
              href="mailto:support@simplesign.se"
              className="block w-full py-3 px-4 rounded-lg border border-white/20 text-white font-medium hover:bg-white/10 transition"
            >
              Kontakta support
            </a>
          </div>

          <p className="text-xs text-white/40 mt-8">
            Om problemet kvarstår, vänligen kontakta support@simplesign.se med detta fel för assistans.
          </p>
        </div>
      </div>
    </div>
  )
}

export default function CheckoutFailurePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#0A0A0B]">
          <div className="text-white/60">Laddar...</div>
        </div>
      }
    >
      <FailureContent />
    </Suspense>
  )
}
