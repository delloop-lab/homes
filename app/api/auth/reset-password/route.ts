import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { code, password } = await request.json()

    if (!code || !password) {
      return NextResponse.json(
        { error: 'Code and password are required' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      )
    }

    console.log('[Reset Password API] Starting password reset...')
    console.log('[Reset Password API] Code (first 20 chars):', code.substring(0, 20))

    const supabase = createClient()
    if (!supabase) {
      console.error('[Reset Password API] Supabase client not available')
      return NextResponse.json(
        { error: 'Authentication service unavailable' },
        { status: 500 }
      )
    }

    // Step 1: Exchange code for session
    console.log('[Reset Password API] Exchanging code for session...')
    const { data: sessionData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      console.error('[Reset Password API] Code exchange error:', exchangeError)
      return NextResponse.json(
        { error: exchangeError.message || 'Invalid or expired reset code' },
        { status: 400 }
      )
    }

    if (!sessionData?.session) {
      console.error('[Reset Password API] No session returned from code exchange')
      return NextResponse.json(
        { error: 'Failed to establish session from reset code' },
        { status: 400 }
      )
    }

    console.log('[Reset Password API] Session established, updating password...')

    // Step 2: Update password using the session
    const { error: updateError } = await supabase.auth.updateUser({
      password: password
    })

    if (updateError) {
      console.error('[Reset Password API] Password update error:', updateError)
      return NextResponse.json(
        { error: updateError.message || 'Failed to update password' },
        { status: 400 }
      )
    }

    console.log('[Reset Password API] Password updated successfully')

    return NextResponse.json({
      success: true,
      message: 'Password updated successfully'
    })

  } catch (error: any) {
    console.error('[Reset Password API] Unexpected error:', error)
    return NextResponse.json(
      { error: error?.message || 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

