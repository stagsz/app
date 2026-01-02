'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { XCircle } from 'lucide-react'
import { Suspense } from 'react'

function CancelContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const plan = searchParams.get('plan')

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0A0A0B]">
      <div className="pointer-events-none fixed top-0 right-1/4 h-[500px] w-[500px] translate-x-1/2 rounded-full bg-orange-500/20 blur-[120px]" />

      <div className="relative max-w-md text-center">
        <div className="rounded-2xl border border-orange-500/20 bg-orange-500/10 backdrop-blur-sm p-8">
          <XCircle className="h-16 w-16 text-orange-400 mx-auto mb-6" />

          <h1 className="text-2xl font-bold text-white mb-2">Checkout avbruten</h1>

          <p className="text-white/60 mb-8">
            Du avbröt Klarna checkout. Din beställning har inte genomförts.
          </p>

          <p className="text-white/50 text-sm mb-8">
            Ingen summa har debiterats från ditt konto.
          </p>

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

            <Link
              href="/pricing"
              className="block w-full py-3 px-4 rounded-lg border border-white/20 text-white font-medium hover:bg-white/10 transition"
            >
              Se alla planer
            </Link>
          </div>

          <p className="text-xs text-white/40 mt-8">
            Behöver du hjälp? Kontakta support@simplesign.se
          </p>
        </div>
      </div>
    </div>
  )
}

export default function CheckoutCancelPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#0A0A0B]">
          <div className="text-white/60">Laddar...</div>
        </div>
      }
    >
      <CancelContent />
    </Suspense>
  )
}
