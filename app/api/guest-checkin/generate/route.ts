import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// POST /api/guest-checkin/generate - Generate guest check-in token
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
        { error: 'Only hosts can generate guest check-in tokens' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { booking_id, expires_days = 30 } = body

    if (!booking_id) {
      return NextResponse.json(
        { error: 'booking_id is required' },
        { status: 400 }
      )
    }

    // Verify host owns this booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        id,
        guest_name,
        contact_email,
        check_in,
        check_out,
        properties!inner(
          id,
          name,
          host_id
        )
      `)
      .eq('id', booking_id)
      .single()

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }

    if (booking.properties.host_id !== user.id) {
      return NextResponse.json(
        { error: 'You can only generate tokens for your own bookings' },
        { status: 403 }
      )
    }

    if (!booking.contact_email) {
      return NextResponse.json(
        { error: 'Booking must have guest email to generate check-in token' },
        { status: 400 }
      )
    }

    // Generate token using database function
    const { data: tokenData, error: tokenError } = await supabase
      .rpc('create_guest_checkin_token', {
        p_booking_id: booking_id,
        p_expires_days: expires_days
      })

    if (tokenError) {
      console.error('Token generation error:', tokenError)
      return NextResponse.json(
        { error: 'Failed to generate check-in token' },
        { status: 500 }
      )
    }

    const token = tokenData[0]?.token
    const expires_at = tokenData[0]?.expires_at

    if (!token) {
      return NextResponse.json(
        { error: 'Failed to generate token' },
        { status: 500 }
      )
    }

    // Generate the check-in URL
    const baseUrl = process.env.NEXT_PUBLIC_VERCEL_URL 
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
      : process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    
    const checkinUrl = `${baseUrl}/guest-checkin/${token}`

    return NextResponse.json({
      success: true,
      data: {
        token,
        checkin_url: checkinUrl,
        expires_at,
        booking: {
          id: booking.id,
          guest_name: booking.guest_name,
          guest_email: booking.contact_email,
          property_name: booking.properties.name,
          check_in: booking.check_in,
          check_out: booking.check_out
        }
      }
    })

  } catch (error) {
    console.error('Generate token API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/guest-checkin/generate?booking_id=uuid - Get existing token info
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
    const booking_id = searchParams.get('booking_id')

    if (!booking_id) {
      return NextResponse.json(
        { error: 'booking_id parameter is required' },
        { status: 400 }
      )
    }

    // Get existing token for booking
    const { data: existingToken, error: tokenError } = await supabase
      .from('guest_checkin_tokens')
      .select(`
        id,
        token,
        expires_at,
        is_active,
        revoked_at,
        access_count,
        accessed_at,
        bookings!inner(
          id,
          guest_name,
          contact_email,
          properties!inner(
            id,
            name,
            host_id
          )
        )
      `)
      .eq('booking_id', booking_id)
      .single()

    if (tokenError || !existingToken) {
      return NextResponse.json(
        { error: 'No check-in token found for this booking' },
        { status: 404 }
      )
    }

    // Verify host owns this booking
    if (existingToken.bookings.properties.host_id !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Generate the check-in URL
    const baseUrl = process.env.NEXT_PUBLIC_VERCEL_URL 
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
      : process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    
    const checkinUrl = `${baseUrl}/guest-checkin/${existingToken.token}`

    // Check if token is expired
    const isExpired = new Date(existingToken.expires_at) < new Date()

    return NextResponse.json({
      success: true,
      data: {
        token: existingToken.token,
        checkin_url: checkinUrl,
        expires_at: existingToken.expires_at,
        is_active: existingToken.is_active && !isExpired,
        is_expired: isExpired,
        revoked_at: existingToken.revoked_at,
        access_count: existingToken.access_count,
        last_accessed: existingToken.accessed_at,
        booking: {
          guest_name: existingToken.bookings.guest_name,
          guest_email: existingToken.bookings.contact_email,
          property_name: existingToken.bookings.properties.name
        }
      }
    })

  } catch (error) {
    console.error('Get token API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}