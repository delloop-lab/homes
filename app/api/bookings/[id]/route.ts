import { NextRequest, NextResponse } from 'next/server'
import { bookingService } from '@/lib/bookings'

// GET /api/bookings/[id] - Get single booking
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    const result = await bookingService.getBooking(id)

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: result.error.includes('not found') ? 404 : 400 }
      )
    }

    if (!result.data) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(result.data)

  } catch (error) {
    console.error(`GET /api/bookings/${params.id} error:`, error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/bookings/[id] - Update booking
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()
    const {
      guest_name,
      contact_email,
      contact_phone,
      check_in,
      check_out,
      booking_platform,
      total_amount,
      status,
      notes,
      passport_image_url
    } = body

    // Robust parsing helpers
    const parseDate = (v: any) => (v ? new Date(v) : undefined)
    const parseNumber = (v: any) => {
      if (v === null || v === undefined || v === '') return undefined
      if (typeof v === 'number') return v
      const cleaned = String(v).trim().replace(/[^0-9.,-]/g, '').replace(/,/g, '')
      const num = parseFloat(cleaned)
      return Number.isNaN(num) ? undefined : num
    }

    const updateData = {
      id,
      guest_name,
      contact_email,
      contact_phone,
      check_in: parseDate(check_in),
      check_out: parseDate(check_out),
      booking_platform,
      total_amount: parseNumber(total_amount),
      status,
      notes,
      passport_image_url
    }

    // Remove undefined fields
    Object.keys(updateData).forEach(key => {
      if (updateData[key as keyof typeof updateData] === undefined) {
        delete updateData[key as keyof typeof updateData]
      }
    })

    const result = await bookingService.updateBooking(updateData)

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json(result.data)

  } catch (error) {
    console.error(`PUT /api/bookings/${params.id} error:`, error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/bookings/[id] - Delete booking
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    const result = await bookingService.deleteBooking(id)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error(`DELETE /api/bookings/${params.id} error:`, error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}