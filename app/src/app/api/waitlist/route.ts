import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

const waitlistSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = waitlistSchema.parse(body)

    // Use service role for waitlist (no auth needed)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    // If no Supabase configured yet, just log and return success (for development)
    if (!supabaseUrl || !supabaseServiceKey) {
      console.log('Waitlist signup (no DB configured):', email)
      return NextResponse.json({ success: true })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Check if email already exists
    const { data: existing } = await supabase
      .from('waitlist')
      .select('id')
      .eq('email', email)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'You are already on the waitlist!' },
        { status: 400 }
      )
    }

    // Add to waitlist
    const { error } = await supabase.from('waitlist').insert({ email })

    if (error) {
      console.error('Waitlist error:', error)
      return NextResponse.json(
        { error: 'Failed to join waitlist. Please try again.' },
        { status: 500 }
      )
    }

    // TODO: Send confirmation email via Resend
    // const resend = new Resend(process.env.RESEND_API_KEY)
    // await resend.emails.send({
    //   from: 'SimpleSign <hello@simplesign.se>',
    //   to: email,
    //   subject: 'Welcome to the SimpleSign waitlist!',
    //   html: '...'
    // })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }

    console.error('Waitlist error:', error)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
