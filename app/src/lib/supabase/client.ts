import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase env vars:', {
      url: supabaseUrl ? 'set' : 'MISSING',
      key: supabaseKey ? 'set' : 'MISSING'
    })
    throw new Error('Supabase configuration missing')
  }

  return createBrowserClient(supabaseUrl, supabaseKey)
}
