import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const title = formData.get('title') as string || file.name.replace('.pdf', '')

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF files are allowed' }, { status: 400 })
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be less than 10MB' }, { status: 400 })
    }

    // Admin emails bypass all limits
    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase())
    const isAdmin = user.email && adminEmails.includes(user.email.toLowerCase())

    // Check user's document limit (skip if user doesn't exist in users table yet)
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('documents_used, documents_limit')
      .eq('id', user.id)
      .single()

    // If user doesn't exist in users table, create them
    if (userError || !userData) {
      console.log('User not found in users table, creating...')
      await supabase.from('users').insert({
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name || user.email?.split('@')[0],
        plan: isAdmin ? 'admin' : 'free',
        documents_limit: isAdmin ? 9999 : 3,
        documents_used: 0
      }).select().single()
    } else if (!isAdmin && userData.documents_used >= userData.documents_limit) {
      return NextResponse.json({
        error: 'Dokumentgräns nådd. Uppgradera din plan.'
      }, { status: 403 })
    }

    // Upload to Supabase Storage
    const fileExt = 'pdf'
    const fileName = `${user.id}/${crypto.randomUUID()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(fileName, file, {
        contentType: 'application/pdf',
        upsert: false
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('documents')
      .getPublicUrl(fileName)

    // Create document record
    const { data: document, error: dbError } = await supabase
      .from('documents')
      .insert({
        user_id: user.id,
        title,
        file_url: publicUrl,
        status: 'draft'
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      // Clean up uploaded file
      await supabase.storage.from('documents').remove([fileName])
      return NextResponse.json({ error: 'Failed to create document' }, { status: 500 })
    }

    // Increment user's document count atomically
    await supabase.rpc('increment_documents_used', { user_uuid: user.id })

    return NextResponse.json({ document })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
