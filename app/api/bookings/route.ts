import { NextRequest, NextResponse } from 'next/server'
import { bookingService } from '@/lib/bookings'

// GET /api/bookings - Get bookings with optional filters
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const property_id = url.searchParams.get('property_id') || undefined
    const status = url.searchParams.get('status') || undefined
    const date_from = url.searchParams.get('date_from') 
    const date_to = url.searchParams.get('date_to')
    const limit = url.searchParams.get('limit')
    const offset = url.searchParams.get('offset')

    const filters = {
      property_id,
      status,
      date_from: date_from ? new Date(date_from) : undefined,
      date_to: date_to ? new Date(date_to) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined
    }

    const result = await bookingService.getBookings(filters)

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      data: result.data,
      count: result.count
    })

  } catch (error) {
    console.error('GET /api/bookings error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/bookings - Create new booking
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      property_id,
      guest_name,
      contact_email,
      check_in,
      check_out,
      booking_platform,
      total_amount,
      status,
      notes
    } = body

    // Validate required fields
    if (!property_id || !guest_name || !check_in || !check_out) {
      return NextResponse.json(
        { error: 'Missing required fields: property_id, guest_name, check_in, check_out' },
        { status: 400 }
      )
    }

    const bookingData = {
      property_id,
      guest_name,
      contact_email,
      check_in: new Date(check_in),
      check_out: new Date(check_out),
      booking_platform,
      total_amount: total_amount ? parseFloat(total_amount) : undefined,
      status,
      notes
    }

    const result = await bookingService.createBooking(bookingData)

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json(result.data, { status: 201 })

  } catch (error) {
    console.error('POST /api/bookings error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}