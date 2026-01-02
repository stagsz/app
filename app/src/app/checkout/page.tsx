'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const PLAN_PRICES: Record<string, { name: string; price: number; documents: number }> = {
  starter: { name: 'Starter', price: 99, documents: 30 },
  pro: { name: 'Pro', price: 249, documents: 150 },
  business: { name: 'Business', price: 599, documents: -1 } // -1 = unlimited
}

function CheckoutContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const plan = searchParams.get('plan') || 'starter'
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const initializeCheckout = async () => {
      try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          router.push('/auth/login')
          return
        }

        const planInfo = PLAN_PRICES[plan]
        if (!planInfo) {
          setError('Ogiltig plan')
          return
        }

        // Create Klarna order via API
        const response = await fetch('/api/checkout/klarna', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            plan,
            planName: planInfo.name,
            price: planInfo.price
          })
        })

        const data = await response.json()

        if (!response.ok) {
          setError(data.error || 'Kunde inte initiera checkout')
          return
        }

        // Redirect to Klarna Checkout
        if (data.redirectUrl) {
          window.location.href = data.redirectUrl
        } else {
          setError('Kunde inte hämta checkout URL')
        }
      } catch (err) {
        setError('Ett fel uppstod. Försök igen senare.')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    initializeCheckout()
  }, [plan, router])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0B]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
          <p className="text-white/60">Förbereder checkout...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0B]">
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-6 max-w-md text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition"
          >
            Gå tillbaka
          </button>
        </div>
      </div>
    )
  }

  return null
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0B]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
          <p className="text-white/60">Laddar...</p>
        </div>
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  )
}
