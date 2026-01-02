import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimiters, rateLimitResponse } from '@/lib/rate-limit'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  // Rate limiting
  const { success, resetAt } = rateLimiters.signSubmit(request)
  if (!success) {
    return rateLimitResponse(resetAt)
  }

  try {
    const { token } = await params
    const supabase = await createClient()

    // Get optional decline reason
    let reason = ''
    try {
      const body = await request.json()
      reason = body.reason || ''
    } catch {
      // No body is fine
    }

    // Find signer
    const { data: signer, error: signerError } = await supabase
      .from('signers')
      .select('id, document_id, status, email, name')
      .eq('access_token', token)
      .single()

    if (signerError || !signer) {
      return NextResponse.json(
        { error: 'Ogiltig eller utgången länk' },
        { status: 404 }
      )
    }

    if (signer.status === 'signed') {
      return NextResponse.json(
        { error: 'Du har redan signerat detta dokument' },
        { status: 400 }
      )
    }

    if (signer.status === 'declined') {
      return NextResponse.json(
        { error: 'Du har redan avböjt detta dokument' },
        { status: 400 }
      )
    }

    // Update signer status to declined
    const { error: updateError } = await supabase
      .from('signers')
      .update({ status: 'declined' })
      .eq('id', signer.id)

    if (updateError) {
      console.error('Failed to update signer:', updateError)
      return NextResponse.json(
        { error: 'Kunde inte avböja dokumentet' },
        { status: 500 }
      )
    }

    // Update document status to declined
    await supabase
      .from('documents')
      .update({ status: 'declined' })
      .eq('id', signer.document_id)

    // Create audit log
    await supabase.from('audit_logs').insert({
      document_id: signer.document_id,
      signer_id: signer.id,
      action: 'document_declined',
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      user_agent: request.headers.get('user-agent'),
      metadata: {
        reason: reason || null,
        signer_email: signer.email,
        signer_name: signer.name
      }
    })

    // TODO: Send notification email to document owner about declined document

    return NextResponse.json({
      success: true,
      message: 'Du har avböjt att signera dokumentet'
    })
  } catch (error) {
    console.error('Decline error:', error)
    return NextResponse.json(
      { error: 'Internt serverfel' },
      { status: 500 }
    )
  }
}
