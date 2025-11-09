import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Read raw envs and normalize URL
const RAW_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const RAW_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

function normalizeSupabaseUrl(url: string | undefined): string | undefined {
  if (!url) return url
  let normalized = url.trim()
  normalized = normalized.replace(/\.supabase\.com\b/, '.supabase.co')
  normalized = normalized.replace(/\/+$/, '')
  return normalized
}

const SUPABASE_URL = normalizeSupabaseUrl(RAW_SUPABASE_URL)
const SUPABASE_ANON_KEY = RAW_SUPABASE_ANON_KEY

// Server-side Supabase client for server components and API routes
export function createServerSupabaseClient() {
  try {
    const cookieStore = cookies()
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return null
    }
    return createServerClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )
  } catch (error) {
    console.warn('Supabase server client creation failed:', error)
    return null
  }
}