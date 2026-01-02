import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { mergeSignaturesIntoPdf, generateCompletionCertificate, combinePdfs } from '@/lib/pdf'
import { sendCompletionNotification } from '@/lib/email'
import { z } from 'zod'
import { rateLimiters, rateLimitResponse } from '@/lib/rate-limit'

// Schema for validating field values
const FieldValuesSchema = z.record(
  z.string().uuid(),
  z.string().min(1).max(500000) // Allow data URLs up to ~500KB
)

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  // Rate limiting: 10 requests per minute per IP
  const { success, resetAt } = rateLimiters.signSubmit(request)
  if (!success) {
    return rateLimitResponse(resetAt)
  }

  try {
    const { token } = await params
    const supabase = await createClient()

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

    const body = await request.json()

    // Validate fieldValues with Zod
    const parseResult = FieldValuesSchema.safeParse(body.fieldValues)
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Ogiltigt signaturformat', details: parseResult.error.flatten() },
        { status: 400 }
      )
    }

    const fieldValues = parseResult.data

    if (Object.keys(fieldValues).length === 0) {
      return NextResponse.json(
        { error: 'Inga signaturer att spara' },
        { status: 400 }
      )
    }

    // Get signature fields
    const { data: fields } = await supabase
      .from('signature_fields')
      .select('*')
      .eq('document_id', signer.document_id)
      .eq('signer_id', signer.id)

    if (!fields || fields.length === 0) {
      return NextResponse.json(
        { error: 'Inga signaturfält hittades' },
        { status: 400 }
      )
    }

    // Update field values
    for (const field of fields) {
      const value = fieldValues[field.id]
      if (value) {
        await supabase
          .from('signature_fields')
          .update({ value })
          .eq('id', field.id)
      }
    }

    // Update signer status
    await supabase
      .from('signers')
      .update({
        status: 'signed',
        signed_at: new Date().toISOString()
      })
      .eq('id', signer.id)

    // Create audit log
    await supabase.from('audit_logs').insert({
      document_id: signer.document_id,
      signer_id: signer.id,
      action: 'document_signed',
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      user_agent: request.headers.get('user-agent'),
      metadata: {
        fields_signed: Object.keys(fieldValues).length
      }
    })

    // Check if all signers have signed
    const { data: allSigners } = await supabase
      .from('signers')
      .select('id, status, name, email, signed_at')
      .eq('document_id', signer.document_id)

    const allSigned = allSigners?.every(s => s.status === 'signed')

    if (allSigned) {
      // Get document details
      const { data: document } = await supabase
        .from('documents')
        .select('id, title, file_url, user_id')
        .eq('id', signer.document_id)
        .single()

      if (document) {
        try {
          // Get all signature fields with values
          const { data: allFields } = await supabase
            .from('signature_fields')
            .select('*')
            .eq('document_id', signer.document_id)

          // Merge signatures into PDF
          const signedPdfBytes = await mergeSignaturesIntoPdf({
            pdfUrl: document.file_url,
            fields: allFields || []
          })

          // Generate completion certificate
          const certificateBytes = await generateCompletionCertificate(
            document.title,
            (allSigners || []).map(s => ({
              name: s.name || s.email,
              email: s.email,
              signedAt: s.signed_at || new Date().toISOString()
            }))
          )

          // Combine signed PDF with certificate
          const finalPdfBytes = await combinePdfs([signedPdfBytes, certificateBytes])

          // Upload signed PDF to storage
          const signedFileName = `${document.user_id}/signed_${document.id}.pdf`

          const { error: uploadError } = await supabase.storage
            .from('documents')
            .upload(signedFileName, finalPdfBytes, {
              contentType: 'application/pdf',
              upsert: true
            })

          if (!uploadError) {
            // Get public URL for signed document
            const { data: { publicUrl } } = supabase.storage
              .from('documents')
              .getPublicUrl(signedFileName)

            // Update document with signed file URL
            await supabase
              .from('documents')
              .update({
                status: 'completed',
                file_url: publicUrl
              })
              .eq('id', signer.document_id)
          } else {
            console.error('Failed to upload signed PDF:', uploadError)
            // Still mark as completed even if upload fails
            await supabase
              .from('documents')
              .update({ status: 'completed' })
              .eq('id', signer.document_id)
          }

          // Get document owner email for notification
          const { data: owner } = await supabase
            .from('users')
            .select('email, name')
            .eq('id', document.user_id)
            .single()

          // Send completion notifications
          if (owner) {
            await sendCompletionNotification({
              to: owner.email,
              recipientName: owner.name || owner.email.split('@')[0],
              documentTitle: document.title
            })
          }

          // Notify all signers
          for (const s of allSigners || []) {
            await sendCompletionNotification({
              to: s.email,
              recipientName: s.name || s.email.split('@')[0],
              documentTitle: document.title
            })
          }
        } catch (pdfError) {
          console.error('Failed to merge signatures into PDF:', pdfError)

          // Log the failure
          await supabase.from('audit_logs').insert({
            document_id: signer.document_id,
            action: 'pdf_merge_failed',
            metadata: {
              error: pdfError instanceof Error ? pdfError.message : 'Unknown error'
            }
          })

          // Return error - don't mark as completed without merged PDF
          return NextResponse.json(
            {
              error: 'Signaturen sparades men det gick inte att skapa det slutgiltiga dokumentet. Vänligen kontakta support.',
              signed: true,
              pdfError: true
            },
            { status: 500 }
          )
        }
      }

      await supabase.from('audit_logs').insert({
        document_id: signer.document_id,
        action: 'document_completed',
        metadata: { total_signers: allSigners?.length }
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Submit signature error:', error)
    return NextResponse.json(
      { error: 'Kunde inte spara signaturen' },
      { status: 500 }
    )
  }
}
