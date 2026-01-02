import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimiters, rateLimitResponse } from '@/lib/rate-limit'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  // Rate limiting: 30 requests per minute per IP
  const { success, resetAt } = rateLimiters.signToken(request)
  if (!success) {
    return rateLimitResponse(resetAt)
  }

  try {
    const { token } = await params
    const supabase = await createClient()

    // Find signer by access token
    const { data: signer, error: signerError } = await supabase
      .from('signers')
      .select(`
        id,
        name,
        email,
        status,
        document_id,
        identity_verified
      `)
      .eq('access_token', token)
      .single()

    if (signerError || !signer) {
      return NextResponse.json(
        { error: 'Ogiltig eller utgången länk' },
        { status: 404 }
      )
    }

    // Get document
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('id, title, file_url, status, expires_at')
      .eq('id', signer.document_id)
      .single()

    if (docError || !document) {
      return NextResponse.json(
        { error: 'Dokumentet hittades inte' },
        { status: 404 }
      )
    }

    // Check if document has expired
    if (document.status === 'expired') {
      return NextResponse.json(
        { error: 'Dokumentet har utgått' },
        { status: 410 }
      )
    }

    // Check expiration date
    if (document.expires_at && new Date(document.expires_at) < new Date()) {
      // Update document status to expired
      await supabase
        .from('documents')
        .update({ status: 'expired' })
        .eq('id', document.id)

      return NextResponse.json(
        { error: 'Signeringslänken har utgått' },
        { status: 410 }
      )
    }

    // Check if already signed
    if (signer.status === 'signed') {
      return NextResponse.json(
        { error: 'Du har redan signerat detta dokument' },
        { status: 400 }
      )
    }

    // Get signature fields for this signer
    const { data: fields } = await supabase
      .from('signature_fields')
      .select('id, type, page, x, y, width, height, value')
      .eq('document_id', signer.document_id)
      .eq('signer_id', signer.id)
      .order('page', { ascending: true })

    // Log document view if not already signed
    if (signer.status === 'pending') {
      await supabase
        .from('signers')
        .update({ status: 'viewed' })
        .eq('id', signer.id)

      await supabase.from('audit_logs').insert({
        document_id: signer.document_id,
        signer_id: signer.id,
        action: 'document_viewed',
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        user_agent: request.headers.get('user-agent')
      })
    }

    return NextResponse.json({
      id: signer.id,
      name: signer.name,
      email: signer.email,
      status: signer.status,
      identity_verified: signer.identity_verified || false,
      document: {
        id: document.id,
        title: document.title,
        file_url: document.file_url
      },
      fields: fields || []
    })
  } catch (error) {
    console.error('Sign page error:', error)
    return NextResponse.json(
      { error: 'Internt serverfel' },
      { status: 500 }
    )
  }
}
