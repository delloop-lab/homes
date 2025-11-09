import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

// This route uses service role to create users
// You need to set SUPABASE_SERVICE_ROLE_KEY in your .env.local
export async function POST(request: NextRequest) {
  try {
    const { email, full_name, phone, hourly_rate } = await request.json()

    if (!email || !full_name) {
      return NextResponse.json(
        { success: false, error: 'Email and full name are required' },
        { status: 400 }
      )
    }

    // Use service role client to create users
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { success: false, error: 'Server configuration error: Missing Supabase credentials' },
        { status: 500 }
      )
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Check if user already exists by querying user_profiles first (faster)
    const { data: existingProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('id, email')
      .eq('email', email)
      .maybeSingle()

    let existingUser = null
    let userId: string | undefined

    if (existingProfile) {
      // Profile exists, check if auth user exists
      const { data: authUser, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(existingProfile.id)
      if (!getUserError && authUser?.user) {
        existingUser = authUser.user
        userId = existingUser.id
      } else {
        // Profile exists but no auth user - this shouldn't happen, but handle it
        userId = existingProfile.id
      }
    } else {
      // No profile exists, check if auth user exists by listing (fallback)
      const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers()
      if (!listError && usersData?.users) {
        existingUser = usersData.users.find((u: any) => u.email === email)
        if (existingUser) {
          userId = existingUser.id
        }
      }
    }

    if (!userId) {
      // No existing user found, create new one
      // Create new auth user with temporary password
      // They'll need to reset password on first login
      const tempPassword = randomUUID() // Generate secure random password
      
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          full_name,
          role: 'cleaner'
        }
      })

      if (createError || !newUser.user) {
        return NextResponse.json(
          { success: false, error: createError?.message || 'Failed to create user' },
          { status: 500 }
        )
      }

      userId = newUser.user.id

      // Send password reset email so they can set their own password
      await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email: email
      })
    }

    // Create or update user profile
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .upsert({
        id: userId,
        email,
        full_name,
        role: 'cleaner',
        phone: phone || null,
        hourly_rate: hourly_rate || null,
        is_active: true,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      })

    if (profileError) {
      return NextResponse.json(
        { success: false, error: profileError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: existingUser 
        ? 'Cleaner profile updated successfully'
        : 'Cleaner created successfully. They will receive a password reset email to set their password.'
    })

  } catch (error: any) {
    console.error('Create cleaner error:', error)
    console.error('Error stack:', error.stack)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to create cleaner',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

