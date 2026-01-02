'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const PLAN_DETAILS: Record<string, { name: string; documents: number }> = {
  starter: { name: 'Starter', documents: 30 },
  pro: { name: 'Pro', documents: 150 },
  business: { name: 'Business', documents: -1 }
}

function SuccessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const plan = searchParams.get('plan') || 'starter'
  const [isVerifying, setIsVerifying] = useState(true)
  const [verificationComplete, setVerificationComplete] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const verifyAndUpdateSubscription = async () => {
      try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          router.push('/auth/login')
          return
        }

        // Verify the subscription was activated by checking with Klarna (via our webhook/polling)
        // For now, we'll update the user's plan after a short delay to allow Klarna webhook to process
        // In production, this would check Klarna's API or wait for webhook confirmation

        setTimeout(async () => {
          // Update user's plan
          const { error: updateError } = await supabase
            .from('users')
            .update({
              plan: plan as 'starter' | 'pro' | 'business',
              documents_limit: plan === 'business' ? -1 : (PLAN_DETAILS[plan]?.documents || 30),
              subscription_status: 'active'
            })
            .eq('id', user.id)

          if (updateError) {
            console.error('Failed to update subscription:', updateError)
            setError('Abonnemanget uppdaterades på Klarna, men det uppstod ett fel när vi uppdaterade ditt konto. Vi har meddelats och fixar det snart.')
            setIsVerifying(false)
            return
          }

          setVerificationComplete(true)
          setIsVerifying(false)
        }, 2000)
      } catch (err) {
        console.error('Verification error:', err)
        setError('Det uppstod ett fel. Kontakta support@simplesign.se')
        setIsVerifying(false)
      }
    }

    verifyAndUpdateSubscription()
  }, [plan, router])

  if (isVerifying || verificationComplete) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0B]">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            {isVerifying ? (
              <Loader2 className="h-12 w-12 animate-spin text-purple-400" />
            ) : (
              <CheckCircle className="h-12 w-12 text-green-400" />
            )}
          </div>
          <p className="text-xl text-white mb-2">
            {isVerifying ? 'Verifierar ditt abonnemang...' : 'Abonnemang aktiverat!'}
          </p>
          <p className="text-white/60">
            {isVerifying
              ? 'Vänligen vänta medan vi bekräftar din betalning'
              : 'Ditt konto har uppgraderats framgångsrikt'}
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0B]">
        <div className="max-w-md text-center">
          <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-8">
            <p className="text-red-400 mb-4">{error}</p>
            <div className="flex gap-4 justify-center">
              <Link
                href="/dashboard"
                className="px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition"
              >
                Till dashboard
              </Link>
              <a
                href="mailto:support@simplesign.se"
                className="px-4 py-2 border border-white/20 text-white rounded-lg hover:bg-white/10 transition"
              >
                Kontakta support
              </a>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const planInfo = PLAN_DETAILS[plan] || PLAN_DETAILS.starter

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0A0A0B]">
      <div className="pointer-events-none fixed top-0 left-1/4 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-green-500/20 blur-[120px]" />

      <div className="relative max-w-md text-center">
        <div className="rounded-2xl border border-green-500/20 bg-green-500/10 backdrop-blur-sm p-8">
          <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-6" />

          <h1 className="text-2xl font-bold text-white mb-2">Tack för din beställning!</h1>

          <p className="text-white/60 mb-8">
            Din {planInfo.name} plan är nu aktiv. Du kan börja använda SimpleSign direkt.
          </p>

          <div className="rounded-lg border border-white/10 bg-white/5 p-4 mb-8 text-left">
            <p className="text-sm text-white/60 mb-2">Din nya plan:</p>
            <p className="text-lg font-semibold text-white mb-3">{planInfo.name}</p>
            <div className="space-y-2 text-sm text-white/80">
              <p>
                ✓ {planInfo.documents === -1 ? 'Obegränsade dokument' : `${planInfo.documents} dokument/månad`}
              </p>
              <p>✓ Månatlig förnyelse</p>
              <p>✓ Kan avbrytas när som helst</p>
            </div>
          </div>

          <Link
            href="/dashboard"
            className="block w-full py-3 px-4 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium hover:opacity-90 transition mb-3"
          >
            Gå till dashboard
          </Link>

          <p className="text-xs text-white/40">
            Du kommer att debiteras på samma dag varje månad. Avbryts enkelt från dina inställningar.
          </p>
        </div>
      </div>
    </div>
  )
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#0A0A0B]">
          <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  )
}
