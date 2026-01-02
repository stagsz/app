import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const supabase = await createClient()

    // Find signer by access token
    const { data: signer, error: signerError } = await supabase
      .from('signers')
      .select('document_id')
      .eq('access_token', token)
      .single()

    if (signerError || !signer) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 404 })
    }

    // Get document
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('file_url')
      .eq('id', signer.document_id)
      .single()

    if (docError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Extract file path from URL
    const urlParts = document.file_url.split('/documents/')
    if (urlParts.length < 2) {
      return NextResponse.json({ error: 'Invalid file URL' }, { status: 400 })
    }
    const filePath = urlParts[1]

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('documents')
      .download(filePath)

    if (downloadError || !fileData) {
      console.error('Download error:', downloadError)
      return NextResponse.json({ error: 'Failed to download file' }, { status: 500 })
    }

    // Return PDF with proper headers
    const arrayBuffer = await fileData.arrayBuffer()

    return new NextResponse(arrayBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline',
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch (error) {
    console.error('File proxy error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
