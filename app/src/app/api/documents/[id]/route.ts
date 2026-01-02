import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(
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

    // Verify document ownership and get current status
    const { data: document, error: fetchError } = await supabase
      .from('documents')
      .select('id, user_id, status, deleted_at')
      .eq('id', id)
      .single()

    if (fetchError || !document) {
      return NextResponse.json({ error: 'Dokumentet hittades inte' }, { status: 404 })
    }

    if (document.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    if (document.deleted_at) {
      return NextResponse.json({ error: 'Dokumentet är redan raderat' }, { status: 400 })
    }

    // Soft delete the document
    const { error: deleteError } = await supabase
      .from('documents')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)

    if (deleteError) {
      console.error('Failed to delete document:', deleteError)
      return NextResponse.json({ error: 'Kunde inte radera dokumentet' }, { status: 500 })
    }

    // Log the deletion
    await supabase.from('audit_logs').insert({
      document_id: id,
      action: 'document_deleted',
      metadata: { previous_status: document.status }
    })

    return NextResponse.json({ success: true, message: 'Dokumentet har raderats' })
  } catch (error) {
    console.error('Delete error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(
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

    // Get document with signers
    const { data: document, error } = await supabase
      .from('documents')
      .select(`
        *,
        signers (*)
      `)
      .eq('id', id)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .single()

    if (error || !document) {
      return NextResponse.json({ error: 'Dokumentet hittades inte' }, { status: 404 })
    }

    return NextResponse.json({ document })
  } catch (error) {
    console.error('Get document error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
