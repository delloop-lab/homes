import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// POST /api/guest-checkin/revoke - Revoke guest check-in token
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 500 }
      )
    }

    // Verify user is authenticated and is a host
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check if user is host
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['host', 'admin'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Only hosts can revoke guest check-in tokens' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { token, reason = 'Manual revocation by host' } = body

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      )
    }

    // Verify host owns the booking associated with this token
    const { data: tokenInfo, error: tokenError } = await supabase
      .from('guest_checkin_tokens')
      .select(`
        id,
        booking_id,
        is_active,
        bookings!inner(
          id,
          properties!inner(
            id,
            host_id
          )
        )
      `)
      .eq('token', token)
      .single()

    if (tokenError || !tokenInfo) {
      return NextResponse.json(
        { error: 'Token not found' },
        { status: 404 }
      )
    }

    const booking = Array.isArray(tokenInfo.bookings) 
      ? tokenInfo.bookings[0] 
      : tokenInfo.bookings
    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }
    const properties = booking.properties
    const property = Array.isArray(properties) 
      ? properties[0] 
      : (properties as { id: any; host_id: any } | undefined)
    if (!property || property.host_id !== user.id) {
      return NextResponse.json(
        { error: 'You can only revoke tokens for your own bookings' },
        { status: 403 }
      )
    }

    if (!tokenInfo.is_active) {
      return NextResponse.json(
        { error: 'Token is already revoked' },
        { status: 400 }
      )
    }

    // Revoke token using database function
    const { data: revoked, error: revokeError } = await supabase
      .rpc('revoke_guest_token', {
        p_token: token,
        p_revoked_by: user.id,
        p_reason: reason
      })

    if (revokeError) {
      console.error('Token revocation error:', revokeError)
      return NextResponse.json(
        { error: 'Failed to revoke token' },
        { status: 500 }
      )
    }

    if (!revoked) {
      return NextResponse.json(
        { error: 'Token not found or already revoked' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Token revoked successfully'
    })

  } catch (error) {
    console.error('Revoke token API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/guest-checkin/revoke - Get revocation status
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 500 }
      )
    }

    // Verify user is authenticated and is a host
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { error: 'Token parameter is required' },
        { status: 400 }
      )
    }

    // Get token status
    const { data: tokenInfo, error: tokenError } = await supabase
      .from('guest_checkin_tokens')
      .select(`
        id,
        is_active,
        revoked_at,
        revoked_by,
        revoke_reason,
        expires_at,
        access_count,
        bookings!inner(
          id,
          guest_name,
          properties!inner(
            id,
            name,
            host_id
          )
        )
      `)
      .eq('token', token)
      .single()

    if (tokenError || !tokenInfo) {
      return NextResponse.json(
        { error: 'Token not found' },
        { status: 404 }
      )
    }

    // Verify host owns this booking
    const booking = Array.isArray(tokenInfo.bookings) 
      ? tokenInfo.bookings[0] 
      : tokenInfo.bookings
    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }
    const properties = booking.properties
    const property = Array.isArray(properties) 
      ? properties[0] 
      : (properties as { id: any; name: any; host_id: any } | undefined)
    if (!property || property.host_id !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    const isExpired = new Date(tokenInfo.expires_at) < new Date()

    return NextResponse.json({
      success: true,
      data: {
        is_active: tokenInfo.is_active && !isExpired,
        is_expired: isExpired,
        is_revoked: !tokenInfo.is_active,
        revoked_at: tokenInfo.revoked_at,
        revoke_reason: tokenInfo.revoke_reason,
        expires_at: tokenInfo.expires_at,
        access_count: tokenInfo.access_count,
        booking: {
          guest_name: booking.guest_name,
          property_name: property.name
        }
      }
    })

  } catch (error) {
    console.error('Get revocation status API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}