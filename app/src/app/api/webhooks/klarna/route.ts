import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'

/**
 * Klarna Webhook Handler
 *
 * Receives order status updates from Klarna when:
 * - Order is authorized
 * - Order is captured (payment confirmed)
 * - Order is cancelled
 * - Order fails
 *
 * Updates user subscription and plan based on payment confirmation
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get the raw body for signature verification
    const body = await request.text()
    const data = JSON.parse(body)

    // Verify Klarna webhook signature
    const signature = request.headers.get('x-klarna-signature')
    if (!signature) {
      console.error('Missing Klarna signature')
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 401 }
      )
    }

    // Verify webhook authenticity
    const isValid = verifyKlarnaSignature(body, signature)
    if (!isValid) {
      console.error('Invalid Klarna signature')
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }

    const { order_id, status } = data

    if (!order_id || !status) {
      return NextResponse.json(
        { error: 'Missing order_id or status' },
        { status: 400 }
      )
    }

    // Get the order from our database
    const { data: klarna_order, error: fetchError } = await supabase
      .from('klarna_orders')
      .select('*, users(id, email)')
      .eq('klarna_order_id', order_id)
      .single()

    if (fetchError || !klarna_order) {
      console.error('Order not found:', order_id)
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    const user_id = klarna_order.user_id

    // Update order status in our database
    const { error: updateOrderError } = await supabase
      .from('klarna_orders')
      .update({
        status: status,
        updated_at: new Date().toISOString()
      })
      .eq('klarna_order_id', order_id)

    if (updateOrderError) {
      console.error('Failed to update order:', updateOrderError)
      return NextResponse.json(
        { error: 'Failed to update order' },
        { status: 500 }
      )
    }

    // If payment is authorized or captured, activate the subscription
    if (status === 'authorized' || status === 'captured') {
      // Calculate subscription expiry (30 days from now)
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 30)

      const { error: updateUserError } = await supabase
        .from('users')
        .update({
          plan: klarna_order.plan,
          subscription_status: 'active',
          subscription_expires_at: expiresAt.toISOString(),
          documents_limit: getPlanDocumentLimit(klarna_order.plan),
          updated_at: new Date().toISOString()
        })
        .eq('id', user_id)

      if (updateUserError) {
        console.error('Failed to update user subscription:', updateUserError)
        return NextResponse.json(
          { error: 'Failed to activate subscription' },
          { status: 500 }
        )
      }

      // Store subscription_id for future reference
      if (data.subscription_id) {
        await supabase
          .from('klarna_orders')
          .update({ subscription_id: data.subscription_id })
          .eq('klarna_order_id', order_id)
      }

      console.log(`Subscription activated for user ${user_id}:`, klarna_order.plan)
    }

    // Handle cancellation
    if (status === 'cancelled') {
      const { error: cancelError } = await supabase
        .from('users')
        .update({
          subscription_status: 'cancelled',
          plan: 'free'
        })
        .eq('id', user_id)

      if (cancelError) {
        console.error('Failed to cancel subscription:', cancelError)
      }

      console.log(`Subscription cancelled for user ${user_id}:`, klarna_order.plan)
    }

    // Handle failed payment
    if (status === 'failed') {
      console.error(
        `Payment failed for user ${user_id}:`,
        data.error_message || 'Unknown error'
      )
    }

    return NextResponse.json({ success: true, orderId: order_id })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Verify Klarna webhook signature using HMAC-SHA256
 * Klarna sends x-klarna-signature header with HMAC of the request body
 */
function verifyKlarnaSignature(body: string, signature: string): boolean {
  const secret = process.env.KLARNA_WEBHOOK_SECRET
  if (!secret) {
    console.warn('KLARNA_WEBHOOK_SECRET not configured - webhook verification skipped')
    // In development, we might not have the secret configured
    // In production, this should always be configured
    return process.env.NODE_ENV !== 'production'
  }

  const computed = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('base64')

  return computed === signature
}

/**
 * Get document limit for a plan
 */
function getPlanDocumentLimit(plan: string): number {
  const limits: Record<string, number> = {
    starter: 30,
    pro: 150,
    business: -1 // unlimited
  }
  return limits[plan] || 30
}
