import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Get document info
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('file_url, user_id')
      .eq('id', id)
      .single()

    if (docError || !document) {
      console.error('Document query error:', docError)
      return NextResponse.json({
        error: 'Document not found',
        details: docError?.message,
        id
      }, { status: 404 })
    }

    // Extract file path from URL
    // URL format: https://xxx.supabase.co/storage/v1/object/public/documents/user_id/filename.pdf
    const urlParts = document.file_url.split('/documents/')
    if (urlParts.length < 2) {
      return NextResponse.json({
        error: 'Invalid file URL format',
        file_url: document.file_url
      }, { status: 400 })
    }
    const filePath = urlParts[1]
    console.log('Downloading file:', filePath)

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('documents')
      .download(filePath)

    if (downloadError || !fileData) {
      console.error('Download error:', downloadError)
      return NextResponse.json({
        error: 'Failed to download file',
        details: downloadError?.message,
        filePath
      }, { status: 500 })
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
