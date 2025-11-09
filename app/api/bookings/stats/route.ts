import { NextRequest, NextResponse } from 'next/server'
import { bookingService } from '@/lib/bookings'

// GET /api/bookings/stats - Get booking statistics
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const property_id = url.searchParams.get('property_id') || undefined

    const stats = await bookingService.getBookingStats(property_id)

    return NextResponse.json(stats)

  } catch (error) {
    console.error('GET /api/bookings/stats error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}