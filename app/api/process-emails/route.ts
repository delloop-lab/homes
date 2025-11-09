import { NextRequest, NextResponse } from 'next/server'
import { emailScheduler } from '@/lib/email-scheduler'

// GET /api/process-emails - Process pending emails (for cron job)
export async function GET(request: NextRequest) {
  try {
    // Check for authorization header (for cron job security)
    const authHeader = request.headers.get('authorization')
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`
    
    if (process.env.CRON_SECRET && authHeader !== expectedAuth) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('Processing scheduled emails...')
    
    const result = await emailScheduler.processPendingEmails()
    
    return NextResponse.json({
      success: true,
      message: 'Email processing completed',
      stats: result
    })

  } catch (error) {
    console.error('Process emails API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/process-emails - Manually trigger email processing
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, booking_id, email_type } = body

    if (action === 'process_pending') {
      // Process all pending emails
      const result = await emailScheduler.processPendingEmails()
      
      return NextResponse.json({
        success: true,
        message: 'Email processing completed',
        stats: result
      })
    }

    if (action === 'send_now' && booking_id && email_type) {
      // Manually send a specific email type for a booking
      // This would require fetching the booking data first
      return NextResponse.json({
        success: false,
        error: 'Manual email sending not implemented in this endpoint'
      })
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Process emails POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}