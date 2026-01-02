import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendSigningRequest } from '@/lib/email'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify document ownership
    const { data: document } = await supabase
      .from('documents')
      .select('id, user_id, status, title')
      .eq('id', id)
      .single()

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    if (document.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    if (document.status !== 'draft') {
      return NextResponse.json({ error: 'Document already sent' }, { status: 400 })
    }

    const { signers, fields } = await request.json()

    if (!signers || signers.length === 0) {
      return NextResponse.json({ error: 'At least one signer required' }, { status: 400 })
    }

    if (!fields || fields.length === 0) {
      return NextResponse.json({ error: 'At least one signature field required' }, { status: 400 })
    }

    // Validate signature field positions
    const validFieldTypes = ['signature', 'initial', 'date', 'text', 'checkbox']
    const maxPageSize = 2000 // Maximum reasonable PDF page dimension

    for (const field of fields) {
      // Validate field type
      if (!validFieldTypes.includes(field.type)) {
        return NextResponse.json(
          { error: `Ogiltigt fälttyp: ${field.type}` },
          { status: 400 }
        )
      }

      // Validate page number
      if (!Number.isInteger(field.page) || field.page < 1) {
        return NextResponse.json(
          { error: 'Ogiltigt sidnummer' },
          { status: 400 }
        )
      }

      // Validate position and dimensions
      if (
        typeof field.x !== 'number' || field.x < 0 || field.x > maxPageSize ||
        typeof field.y !== 'number' || field.y < 0 || field.y > maxPageSize ||
        typeof field.width !== 'number' || field.width <= 0 || field.width > maxPageSize ||
        typeof field.height !== 'number' || field.height <= 0 || field.height > maxPageSize
      ) {
        return NextResponse.json(
          { error: 'Ogiltiga fältdimensioner' },
          { status: 400 }
        )
      }

      // Validate signer ID exists
      if (!field.signerId || typeof field.signerId !== 'string') {
        return NextResponse.json(
          { error: 'Signerarens ID saknas för fält' },
          { status: 400 }
        )
      }
    }

    // Create signers in database
    const signerRecords = signers.map((signer: { email: string; name: string; id: string }) => ({
      document_id: id,
      email: signer.email,
      name: signer.name,
      status: 'pending',
      access_token: crypto.randomUUID()
    }))

    const { data: createdSigners, error: signerError } = await supabase
      .from('signers')
      .insert(signerRecords)
      .select()

    if (signerError || !createdSigners) {
      console.error('Failed to create signers:', signerError)
      return NextResponse.json({ error: 'Failed to create signers' }, { status: 500 })
    }

    // Map old signer IDs to new database IDs
    const signerIdMap = new Map<string, string>()
    signers.forEach((signer: { id: string; email: string }, index: number) => {
      const dbSigner = createdSigners.find(s => s.email === signer.email)
      if (dbSigner) {
        signerIdMap.set(signer.id, dbSigner.id)
      }
    })

    // Create signature fields
    const fieldRecords = fields.map((field: {
      type: string
      x: number
      y: number
      width: number
      height: number
      page: number
      signerId: string
    }) => ({
      document_id: id,
      signer_id: signerIdMap.get(field.signerId) || createdSigners[0].id,
      type: field.type,
      page: field.page,
      x: field.x,
      y: field.y,
      width: field.width,
      height: field.height,
      required: true
    }))

    const { error: fieldError } = await supabase
      .from('signature_fields')
      .insert(fieldRecords)

    if (fieldError) {
      console.error('Failed to create fields:', fieldError)
      return NextResponse.json({ error: 'Failed to create signature fields' }, { status: 500 })
    }

    // Update document status to pending with 30-day expiration
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30)

    const { error: updateError } = await supabase
      .from('documents')
      .update({
        status: 'pending',
        expires_at: expiresAt.toISOString()
      })
      .eq('id', id)

    if (updateError) {
      console.error('Failed to update document:', updateError)
      return NextResponse.json({ error: 'Failed to update document' }, { status: 500 })
    }

    // Create audit log
    await supabase.from('audit_logs').insert({
      document_id: id,
      action: 'document_sent',
      metadata: { signers: createdSigners.map(s => s.email) }
    })

    // Send emails to signers
    const emailResults = await Promise.all(
      createdSigners.map(signer =>
        sendSigningRequest({
          to: signer.email,
          signerName: signer.name || signer.email.split('@')[0],
          documentTitle: document.title,
          senderName: user.email?.split('@')[0] || 'Någon',
          accessToken: signer.access_token
        })
      )
    )

    // Track email delivery results
    const failedEmails: string[] = []
    const successfulEmails: string[] = []

    emailResults.forEach((result, index) => {
      const email = createdSigners[index].email
      if (result.success) {
        successfulEmails.push(email)
      } else {
        failedEmails.push(email)
      }
    })

    if (failedEmails.length > 0) {
      console.warn('Failed to send emails to:', failedEmails)

      // Log email failures to audit log
      await supabase.from('audit_logs').insert({
        document_id: id,
        action: 'email_delivery_failed',
        metadata: { failedEmails, successfulEmails }
      })
    }

    // Return signing URLs so user can share them manually if email fails
    const signingUrls = createdSigners.map(s => ({
      email: s.email,
      name: s.name,
      signingUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://app-seven-smoky.vercel.app'}/sign/${s.access_token}`,
      emailSent: !failedEmails.includes(s.email)
    }))

    return NextResponse.json({
      success: true,
      signers: signingUrls,
      failedEmails: failedEmails.length > 0 ? failedEmails : undefined,
      message: failedEmails.length > 0
        ? `Dokumentet skickades men mail till ${failedEmails.join(', ')} kunde inte levereras. Dela länkarna manuellt.`
        : 'Dokumentet har skickats för signering!'
    })
  } catch (error) {
    console.error('Send error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
