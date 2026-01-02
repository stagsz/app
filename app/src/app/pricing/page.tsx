import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Check, ArrowLeft } from 'lucide-react'

const plans = [
  {
    name: 'Starter',
    price: 99,
    period: 'månad',
    description: 'Perfekt för små företag',
    limit: '30 dokument/månad',
    features: [
      '30 dokument per månad',
      'Upp till 5 signatärer per dokument',
      'Automatisk signering',
      'E-postmeddelanden',
      'Audit trail',
      'Suppport via email'
    ],
    cta: 'Välj Starter',
    highlighted: false
  },
  {
    name: 'Pro',
    price: 249,
    period: 'månad',
    description: 'För växande team',
    limit: '150 dokument/månad',
    features: [
      '150 dokument per månad',
      'Obegränsat antal signatärer',
      'Automatisk signering',
      'E-postmeddelanden',
      'Audit trail',
      'Prioriterad support',
      'API tillgång',
      'Anpassade mall'
    ],
    cta: 'Välj Pro',
    highlighted: true
  },
  {
    name: 'Business',
    price: 599,
    period: 'månad',
    description: 'För stora organisationer',
    limit: 'Obegränsad',
    features: [
      'Obegränsade dokument',
      'Obegränsat antal signatärer',
      'Automatisk signering',
      'E-postmeddelanden',
      'Audit trail',
      'Dedikerad support',
      'API tillgång',
      'Anpassade mall',
      'Single Sign-On (SSO)',
      'Avancerad rapportering'
    ],
    cta: 'Kontakta oss',
    highlighted: false
  }
]

export default async function PricingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Get user's current plan
  const { data: userData } = await supabase
    .from('users')
    .select('plan')
    .eq('id', user.id)
    .single()

  const currentPlan = userData?.plan

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white">
      {/* Gradient orbs */}
      <div className="pointer-events-none fixed top-0 left-1/4 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-purple-500/20 blur-[120px]" />
      <div className="pointer-events-none fixed top-20 right-1/4 h-[400px] w-[400px] translate-x-1/2 rounded-full bg-blue-500/20 blur-[120px]" />

      {/* Header */}
      <header className="relative border-b border-white/10 bg-[#0A0A0B]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/dashboard" className="flex items-center gap-2 text-white/60 hover:text-white transition">
            <ArrowLeft className="h-5 w-5" />
            <span className="text-sm">Tillbaka</span>
          </Link>
          <h1 className="text-lg font-semibold tracking-tight">SimpleSign Priser</h1>
          <div className="w-20" />
        </div>
      </header>

      <main className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        {/* Title */}
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">Enkla, transparenta priser</h2>
          <p className="text-white/60 max-w-2xl mx-auto">
            Välj en plan som passar ditt företag. Ingen dold avgift, ingen överraskning.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl border backdrop-blur-sm transition-all ${
                plan.highlighted
                  ? 'border-purple-500/50 bg-purple-500/10 ring-2 ring-purple-500/20'
                  : 'border-white/10 bg-white/5 hover:bg-white/10'
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-1 rounded-full text-xs font-medium">
                  Mest populär
                </div>
              )}

              <div className="p-8">
                <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                <p className="text-sm text-white/60 mb-6">{plan.description}</p>

                <div className="mb-6">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold">{plan.price} kr</span>
                    <span className="text-white/60">/{plan.period}</span>
                  </div>
                  <p className="text-sm text-white/50 mt-2">{plan.limit}</p>
                </div>

                {currentPlan === plan.name.toLowerCase() ? (
                  <button disabled className="w-full py-2 px-4 rounded-lg bg-white/10 text-white font-medium mb-8 cursor-default">
                    Din nuvarande plan
                  </button>
                ) : (
                  <Link
                    href={`/checkout?plan=${plan.name.toLowerCase()}`}
                    className={`block w-full py-2 px-4 rounded-lg font-medium text-center mb-8 transition ${
                      plan.highlighted
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90'
                        : 'border border-white/20 text-white hover:bg-white/10'
                    }`}
                  >
                    {plan.cta}
                  </Link>
                )}

                <div className="space-y-4">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-white/80">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto">
          <h3 className="text-2xl font-bold mb-8 text-center">Vanliga frågor</h3>
          <div className="space-y-6">
            <div className="rounded-lg border border-white/10 bg-white/5 p-6">
              <h4 className="font-medium mb-2">Kan jag byta plan senare?</h4>
              <p className="text-sm text-white/60">
                Ja, du kan uppgradera eller nedgradera din plan när som helst. Ändringar träder i kraft omedelbar.
              </p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-6">
              <h4 className="font-medium mb-2">Finns det fri provperiod?</h4>
              <p className="text-sm text-white/60">
                Ja, du får 3 gratis dokument per månad med vår Free-plan. Uppgradera när du är redo.
              </p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-6">
              <h4 className="font-medium mb-2">Vilka betalningsmetoder accepterar ni?</h4>
              <p className="text-sm text-white/60">
                Vi accepterar all kortbetalning, banköverföring och Klarna Faktura (betala senare).
              </p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-6">
              <h4 className="font-medium mb-2">Behövs kreditkort för att börja?</h4>
              <p className="text-sm text-white/60">
                Nej, du kan börja med vår gratis plan utan att ange betalningsuppgifter.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
