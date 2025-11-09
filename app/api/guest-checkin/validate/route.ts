import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

// GET /api/guest-checkin/validate?token=xxx - Validate guest token and get check-in info
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 500 }
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

    // Get client IP and User Agent for security tracking
    const clientIP = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    '127.0.0.1'
    const userAgent = request.headers.get('user-agent') || 'Unknown'

    // Validate token using database function
    const { data: validation, error: validationError } = await supabase
      .rpc('validate_guest_token', {
        p_token: token,
        p_ip_address: clientIP,
        p_user_agent: userAgent
      })

    if (validationError) {
      console.error('Token validation error:', validationError)
      return NextResponse.json(
        { error: 'Failed to validate token' },
        { status: 500 }
      )
    }

    const validationResult = validation[0]

    if (!validationResult.is_valid) {
      return NextResponse.json({
        success: false,
        error: validationResult.error_message,
        expired: validationResult.error_message?.includes('expired') || false
      }, { status: 403 })
    }

    // Get complete check-in information
    const { data: checkinInfo, error: infoError } = await supabase
      .rpc('get_guest_checkin_info', {
        p_token: token
      })

    if (infoError) {
      console.error('Check-in info error:', infoError)
      return NextResponse.json(
        { error: 'Failed to get check-in information' },
        { status: 500 }
      )
    }

    const info = checkinInfo[0]

    return NextResponse.json({
      success: true,
      data: {
        valid_until: validationResult.expires_at,
        booking: info.booking_info,
        property: info.property_info,
        checkin: info.checkin_info
      }
    })

  } catch (error) {
    console.error('Validate token API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/guest-checkin/validate - Log guest page interaction
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { token, action, page, time_spent } = body

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      )
    }

    // Get client information
    const clientIP = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    '127.0.0.1'
    const userAgent = request.headers.get('user-agent') || 'Unknown'

    // First validate the token exists and is active
    const { data: tokenInfo, error: tokenError } = await supabase
      .from('guest_checkin_tokens')
      .select('id, booking_id, is_active, expires_at')
      .eq('token', token)
      .single()

    if (tokenError || !tokenInfo) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 403 }
      )
    }

    if (!tokenInfo.is_active || new Date(tokenInfo.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Token expired or revoked' },
        { status: 403 }
      )
    }

    // Log the interaction
    const { error: logError } = await supabase
      .from('guest_access_logs')
      .insert({
        token_id: tokenInfo.id,
        booking_id: tokenInfo.booking_id,
        ip_address: clientIP,
        user_agent: userAgent,
        pages_viewed: page ? [page] : [],
        time_spent_seconds: time_spent || 0,
        actions_performed: {
          action: action || 'page_view',
          timestamp: new Date().toISOString()
        }
      })

    if (logError) {
      console.error('Failed to log guest interaction:', logError)
      // Don't fail the request if logging fails
    }

    return NextResponse.json({
      success: true,
      message: 'Interaction logged'
    })

  } catch (error) {
    console.error('Log interaction API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}