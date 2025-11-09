export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

type EmailType = 'check_in_instructions' | 'checkout_reminder' | 'thank_you_review'

export async function POST(request: NextRequest) {
  try {
    const { booking_id, email_type }: { booking_id?: string; email_type?: EmailType } = await request.json()

    if (!booking_id || !email_type) {
      return NextResponse.json({ error: 'Missing booking_id or email_type' }, { status: 400 })
    }

    const EFFECTIVE_RESEND = process.env.RESEND_API_KEY || process.env.NEXT_PUBLIC_RESEND_API_KEY
    const EFFECTIVE_FROM = process.env.FROM_EMAIL || process.env.NEXT_PUBLIC_FROM_EMAIL

    const diagnosticsBase = {
      hasResend: !!EFFECTIVE_RESEND,
      hasFrom: !!EFFECTIVE_FROM,
      hasServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      bookingId: booking_id,
      emailType: email_type
    }

    if (!EFFECTIVE_RESEND) {
      console.error('SendNow diagnostics:', diagnosticsBase)
      return NextResponse.json({ error: 'Email service not configured', diagnostics: diagnosticsBase }, { status: 500 })
    }

    const supabase = createServerSupabaseClient()
    const ADMIN_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
    const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY
    const admin = ADMIN_URL && SERVICE_ROLE
      ? createAdminClient(ADMIN_URL, SERVICE_ROLE, { auth: { persistSession: false, autoRefreshToken: false } })
      : null

    // Fetch booking with property info (server-side)
    let booking: any = null
    let bookingErr: any = null
    if (supabase) {
      const res = await supabase
      .from('bookings')
      .select(`
        id,
        guest_name,
        contact_email,
        contact_phone,
        check_in,
        check_out,
        notes,
        booking_platform,
        properties!inner(
          name,
          address
        )
      `)
      .eq('id', booking_id)
      .single()
      booking = res.data
      bookingErr = res.error
    }

    if (bookingErr || !booking) {
      // Fallback to view that already includes property fields
      let vw: any = null
      let vwErr: any = null
      if (supabase) {
        const resV = await supabase
          .from('bookings_with_properties')
          .select('*')
          .eq('id', booking_id)
          .single()
        vw = resV.data
        vwErr = resV.error
      }
      if ((!vw || vwErr) && admin) {
        const resA = await admin
          .from('bookings_with_properties')
          .select('*')
          .eq('id', booking_id)
          .single()
        vw = resA.data
        vwErr = resA.error
      }
      if (vwErr || !vw) {
        const errMsg = vwErr?.message || bookingErr?.message || 'Booking not found'
        console.error('SendNow booking lookup failed:', { errMsg, ...diagnosticsBase })
        return NextResponse.json({ error: errMsg, diagnostics: diagnosticsBase }, { status: 404 })
      }
      booking = {
        id: vw.id,
        guest_name: vw.guest_name,
        contact_email: vw.contact_email,
        contact_phone: vw.contact_phone,
        check_in: vw.check_in,
        check_out: vw.check_out,
        notes: vw.notes,
        booking_platform: vw.booking_platform,
        properties: { name: vw.property_name, address: vw.property_address }
      } as any
    }
    if (!booking.contact_email) {
      return NextResponse.json({ error: 'Booking has no guest email' }, { status: 400 })
    }

    // Generate guest checkin token for check-in instructions
    let guest_checkin_url: string | null = null
    let link_expires: string | null = null
    if (email_type === 'check_in_instructions') {
      const baseUrl = process.env.NEXT_PUBLIC_VERCEL_URL
        ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
        : process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

      // Prefer admin to bypass RLS for token lookups/creation
      if (admin) {
        const { data: existing } = await admin
          .from('guest_checkin_tokens')
          .select('token, expires_at')
          .eq('booking_id', booking.id)
          .maybeSingle()
        if (existing?.token) {
          guest_checkin_url = `${baseUrl}/guest-checkin/${existing.token}`
          link_expires = existing.expires_at
        } else {
          const { data: tdata, error: terr } = await admin
            .rpc('create_guest_checkin_token', { p_booking_id: booking.id, p_expires_days: 30 })
          if (terr) {
            console.error('Token generation error (admin):', terr)
          } else if (tdata && tdata[0]?.token) {
            guest_checkin_url = `${baseUrl}/guest-checkin/${tdata[0].token}`
            link_expires = tdata[0].expires_at
          }
        }
      } else if (supabase) {
        const { data: existingToken } = await supabase
          .from('guest_checkin_tokens')
          .select('token, expires_at')
          .eq('booking_id', booking.id)
          .maybeSingle()
        if (existingToken?.token) {
          guest_checkin_url = `${baseUrl}/guest-checkin/${existingToken.token}`
          link_expires = existingToken.expires_at
        } else {
          const { data: tokenData } = await supabase
            .rpc('create_guest_checkin_token', { p_booking_id: booking.id, p_expires_days: 30 })
          if (tokenData && tokenData[0]?.token) {
            guest_checkin_url = `${baseUrl}/guest-checkin/${tokenData[0].token}`
            link_expires = tokenData[0].expires_at
          }
        }
      }
    }

    const guest = {
      email: booking.contact_email,
      name: booking.guest_name
    }

    const payload = {
      id: booking.id,
      property_name: booking.properties?.name || 'Property',
      property_address: booking.properties?.address || '',
      check_in: booking.check_in,
      check_out: booking.check_out,
      notes: booking.notes,
      booking_platform: booking.booking_platform,
      guest_checkin_url,
      link_expires
    }

    // Import email service lazily to ensure any provider errors are caught and returned as JSON
    const { emailService } = await import('@/lib/email')
    let result: { success: boolean; error?: string }
    try {
      switch (email_type) {
        case 'check_in_instructions':
          result = await emailService.sendCheckInInstructions(guest, payload)
          break
        case 'checkout_reminder':
          result = await emailService.sendCheckoutReminder(guest, payload)
          break
        case 'thank_you_review':
          result = await emailService.sendThankYouAndReview(guest, payload)
          break
        default:
          return NextResponse.json({ error: 'Invalid email_type' }, { status: 400 })
      }
    } catch (providerError: any) {
      const msg = providerError?.message || String(providerError)
      console.error('SendNow provider error:', msg, { to: guest.email, type: email_type, from: process.env.FROM_EMAIL })
      return NextResponse.json({ success: false, error: msg, diagnostics: diagnosticsBase }, { status: 500 })
    }

    if (!result.success) {
      console.error('SendNow failed:', result.error, { to: guest.email, type: email_type })
      return NextResponse.json({ success: false, error: result.error || 'Failed to send', diagnostics: diagnosticsBase }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('POST /api/emails/send-now error:', error)
    return NextResponse.json({ error: String(error) || 'Internal server error' }, { status: 500 })
  }
}


