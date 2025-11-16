import { NextRequest, NextResponse } from 'next/server'
import { format } from 'date-fns'
import { emailService } from '@/lib/email'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    console.log('=== SEND BOOKING TO CLEANER API CALLED ===')
    const body = await request.json()
    console.log('Request body:', { 
      booking_id: body.booking_id, 
      cleaner_id: body.cleaner_id,
      cleaner_email: body.cleaner_email,
      has_host_note: !!body.host_note 
    })
    
    const { booking_id, cleaner_id, cleaner_email, host_note } = body

    if (!booking_id || !cleaner_email) {
      console.error('Missing required fields')
      return NextResponse.json(
        { success: false, error: 'Missing required fields: booking_id, cleaner_email' },
        { status: 400 }
      )
    }

    // Get Supabase admin client to fetch booking details
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      )
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Fetch booking with property details
    console.log('Fetching booking:', booking_id)
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from('bookings_with_properties')
      .select('*')
      .eq('id', booking_id)
      .single()

    if (bookingError || !booking) {
      console.error('Error fetching booking:', bookingError)
      return NextResponse.json(
        { success: false, error: `Booking not found: ${bookingError?.message || 'Unknown error'}` },
        { status: 404 }
      )
    }
    console.log('Booking found:', booking.property_name, booking.guest_name)

    // Get cleaner name if cleaner_id is provided
    let cleanerName = 'Cleaner'
    if (cleaner_id) {
      const { data: cleanerProfile } = await supabaseAdmin
        .from('user_profiles')
        .select('full_name')
        .eq('id', cleaner_id)
        .maybeSingle()
      
      // Only use the cleaner's name if it's not empty
      if (cleanerProfile?.full_name && cleanerProfile.full_name.trim()) {
        cleanerName = cleanerProfile.full_name.trim()
      }
    }
    
    console.log('Cleaner name:', cleanerName)

    // Format dates
    const checkInDate = format(new Date(booking.check_in), 'EEEE, MMMM dd, yyyy')
    const checkOutDate = format(new Date(booking.check_out), 'EEEE, MMMM dd, yyyy')
    const checkInTime = format(new Date(booking.check_in), 'h:mm a')
    const checkOutTime = format(new Date(booking.check_out), 'h:mm a')

    // Build HTML email content
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #111827; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #ffffff; border-radius: 8px; padding: 30px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <h1 style="color: #111827; margin-top: 0; font-size: 24px;">Cleaning Request</h1>
            <p style="color: #4b5563; font-size: 16px;">You have been assigned a cleaning job for the following booking.</p>
            
            <div style="margin-top: 30px; padding: 20px; background-color: #f9fafb; border-left: 4px solid #3b82f6; border-radius: 4px;">
              <h3 style="margin-top: 0; color: #111827; font-size: 18px;">Booking Details</h3>
              <div style="color: #4b5563; margin: 10px 0;">
                <p style="margin: 5px 0;"><strong>Property:</strong> ${booking.property_name?.trim() || 'N/A'}</p>
                <p style="margin: 5px 0;"><strong>Guest Name:</strong> ${booking.guest_name?.trim() || 'N/A'}</p>
                <p style="margin: 5px 0;"><strong>Check-in:</strong> ${checkInDate} at ${checkInTime}</p>
                <p style="margin: 5px 0;"><strong>Check-out:</strong> ${checkOutDate} at ${checkOutTime}</p>
              </div>
            </div>
            
            ${host_note?.trim() ? `
              <div style="margin-top: 20px; padding: 15px; background-color: #ffffff; border-radius: 4px; border: 1px solid #e5e7eb;">
                <p style="margin: 0 0 8px 0; font-weight: 600; color: #111827;">Notes from Host:</p>
                <p style="margin: 0; color: #4b5563; white-space: pre-wrap;">${host_note.trim()}</p>
              </div>
            ` : ''}
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 14px; margin: 0;">Please log in to your account to view full details and update job status.</p>
            </div>
          </div>
        </body>
      </html>
    `

    const textContent = `Cleaning Request

You have been assigned a cleaning job for the following booking.

Booking Details:
Property: ${booking.property_name?.trim() || 'N/A'}
Guest Name: ${booking.guest_name?.trim() || 'N/A'}
Check-in: ${checkInDate} at ${checkInTime}
Check-out: ${checkOutDate} at ${checkOutTime}
${host_note?.trim() ? `\nNotes from Host:\n${host_note.trim()}` : ''}

Please log in to your account to view full details and update job status.`

    // Send email
    const subject = `Cleaning Request - ${booking.property_name || 'Booking'}`
    console.log('Sending email to:', cleaner_email, 'Subject:', subject)
    console.log('HTML content length:', htmlContent.length)
    console.log('Text content length:', textContent.length)
    
    const emailResult = await emailService.sendEmail({
      to: {
        email: cleaner_email.trim(),
        name: cleanerName // Already trimmed and validated above, fallback is 'Cleaner'
      },
      subject: subject.trim(),
      html: htmlContent,
      text: textContent
      // Note: tags removed - Resend validation fails with them
    })
    
    console.log('Email send result:', { success: emailResult.success, messageId: emailResult.messageId, error: emailResult.error })

    if (!emailResult.success) {
      console.error('Failed to send email:', emailResult.error)
      
      // Log failed email attempt
      try {
        const insertData: any = {
          booking_id: booking_id || null,
          cleaner_id: cleaner_id || null,
          cleaner_email: cleaner_email,
          cleaner_name: cleanerName || null,
          subject: subject.substring(0, 500), // Ensure subject doesn't exceed VARCHAR(500)
          email_content: htmlContent || null,
          status: 'failed',
          error_message: emailResult.error || 'Unknown error'
        }
        
        await supabaseAdmin
          .from('cleaning_email_logs')
          .insert(insertData)
      } catch (logError) {
        console.error('Failed to log email error:', logError)
      }
      
      return NextResponse.json({
        success: false,
        error: emailResult.error || 'Failed to send email'
      }, { status: 500 })
    }

    console.log('Email sent successfully:', emailResult.messageId)

    // Log the email to the database
    let loggedSuccessfully = false
    try {
      const insertData: any = {
        booking_id: booking_id || null,
        cleaner_id: cleaner_id || null,
        cleaner_email: cleaner_email,
        cleaner_name: cleanerName || null,
        subject: subject.substring(0, 500), // Ensure subject doesn't exceed VARCHAR(500)
        email_content: htmlContent || null,
        status: 'sent',
        provider_message_id: emailResult.messageId || null,
        error_message: null
      }
      
      // Only include cleaning_ids if it's not null (skip it entirely for booking emails)
      // PostgreSQL arrays can be tricky, so we'll omit it for booking emails
      
      console.log('Attempting to insert email log with data:', {
        booking_id: insertData.booking_id,
        cleaner_email: insertData.cleaner_email,
        cleaner_name: insertData.cleaner_name,
        subject_length: insertData.subject.length,
        has_content: !!insertData.email_content,
        status: insertData.status
      })

      const { data: insertedData, error: insertError } = await supabaseAdmin
        .from('cleaning_email_logs')
        .insert(insertData)
        .select()

      if (insertError) {
        console.error('Failed to log email to database:', insertError)
        console.error('Error details:', {
          code: insertError.code,
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint
        })
      } else {
        loggedSuccessfully = true
        console.log('Email logged to database successfully:', insertedData?.[0]?.id)
      }
    } catch (logError: any) {
      console.error('Exception while logging email:', logError)
      console.error('Error stack:', logError.stack)
    }

    return NextResponse.json({
      success: true,
      message: `Successfully sent booking details to ${cleaner_email}`,
      emailId: emailResult.messageId,
      logged: loggedSuccessfully
    })

  } catch (error: any) {
    console.error('Send booking to cleaner error:', error)
    console.error('Error stack:', error.stack)
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      code: error.code
    })
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to send email',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

