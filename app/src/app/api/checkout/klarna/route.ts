import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const checkoutSchema = z.object({
  plan: z.enum(['starter', 'pro', 'business']),
  planName: z.string(),
  price: z.number()
})

const PLAN_DOCUMENTS: Record<string, number> = {
  starter: 30,
  pro: 150,
  business: -1 // unlimited
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { plan, planName, price } = checkoutSchema.parse(body)

    // Get Klarna credentials from environment
    const klarnaUsername = process.env.KLARNA_USERNAME
    const klarnaPassword = process.env.KLARNA_PASSWORD
    const klarnaApiUrl = process.env.KLARNA_API_URL || 'https://api.klarna.com'
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.simplesign.se'

    if (!klarnaUsername || !klarnaPassword) {
      console.error('Klarna credentials not configured')
      return NextResponse.json(
        { error: 'Payment service not configured' },
        { status: 503 }
      )
    }

    // Create Klarna order
    const orderData = {
      purchase_country: 'SE',
      purchase_currency: 'SEK',
      locale: 'sv-SE',
      order_amount: price * 100, // Klarna expects amount in öre (cents)
      order_lines: [
        {
          type: 'subscription',
          reference: plan,
          name: `SimpleSign ${planName} - Månatlig prenumeration`,
          quantity: 1,
          quantity_unit: 'pcs',
          unit_price: price * 100,
          tax_rate: 2500, // 25% VAT (Sweden)
          total_amount: price * 100,
          total_tax_amount: Math.round(price * 100 * 0.25 / 1.25),
          total_discount_amount: 0
        }
      ],
      customer: {
        email: user.email || ''
      },
      merchant_urls: {
        success: `${appUrl}/checkout/success?plan=${plan}`,
        cancel: `${appUrl}/checkout/cancel?plan=${plan}`,
        failure: `${appUrl}/checkout/failure?plan=${plan}`,
        back: `${appUrl}/pricing`
      },
      merchant_reference: {
        orderid1: `order_${user.id}_${Date.now()}`
      }
    }

    // Create order via Klarna API
    const auth = Buffer.from(`${klarnaUsername}:${klarnaPassword}`).toString('base64')
    const response = await fetch(`${klarnaApiUrl}/checkout/v3/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`
      },
      body: JSON.stringify(orderData)
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('Klarna API error:', error)
      return NextResponse.json(
        { error: 'Kunde inte initiera Klarna checkout' },
        { status: 400 }
      )
    }

    const klarnaOrder = await response.json()

    // Store order in database
    const { error: dbError } = await supabase.from('klarna_orders').insert({
      user_id: user.id,
      klarna_order_id: klarnaOrder.order_id,
      plan,
      amount: price * 100,
      status: 'pending',
      order_type: 'subscription'
    })

    if (dbError) {
      console.error('Failed to store order:', dbError)
      return NextResponse.json(
        { error: 'Kunde inte spara beställning' },
        { status: 500 }
      )
    }

    // Return redirect URL
    return NextResponse.json({
      orderId: klarnaOrder.order_id,
      redirectUrl: klarnaOrder.html_snippet ? undefined : klarnaOrder.redirect_url
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request' },
        { status: 400 }
      )
    }

    console.error('Checkout error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
