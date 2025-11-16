import { NextRequest, NextResponse } from 'next/server'
import { format } from 'date-fns'
import { emailService } from '@/lib/email'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  console.log('=== SEND CLEANING JOBS API CALLED ===')
  try {
    const { cleaner_id, cleaner_email, cleaning_ids, jobs } = await request.json()
    console.log('Request received:', { cleaner_email, jobs_count: jobs?.length })

    if (!cleaner_email || !jobs || jobs.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: cleaner_email, jobs' },
        { status: 400 }
      )
    }

    // Build HTML email content
    const jobsHtml = jobs.map((job: any, index: number) => {
      const date = format(new Date(job.cleaning_date), 'EEEE, MMMM dd, yyyy at h:mm a')
      return `
        <div style="margin-bottom: 30px; padding: 20px; background-color: #f9fafb; border-left: 4px solid #3b82f6; border-radius: 4px;">
          <h3 style="margin-top: 0; color: #111827; font-size: 18px;">Job ${index + 1}: ${job.property_name}</h3>
          <div style="color: #4b5563; margin: 10px 0;">
            <p style="margin: 5px 0;"><strong>Property:</strong> ${job.property_name}</p>
            <p style="margin: 5px 0;"><strong>Address:</strong> ${job.property_address || 'N/A'}</p>
            <p style="margin: 5px 0;"><strong>Date & Time:</strong> ${date}</p>
            ${job.cost ? `<p style="margin: 5px 0;"><strong>Cost:</strong> $${job.cost.toFixed(2)}</p>` : ''}
          </div>
          ${job.notes ? `
            <div style="margin-top: 15px; padding: 15px; background-color: #ffffff; border-radius: 4px; border: 1px solid #e5e7eb;">
              <p style="margin: 0 0 8px 0; font-weight: 600; color: #111827;">Notes:</p>
              <p style="margin: 0; color: #4b5563; white-space: pre-wrap;">${job.notes}</p>
            </div>
          ` : ''}
        </div>
      `
    }).join('')

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #111827; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #ffffff; border-radius: 8px; padding: 30px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <h1 style="color: #111827; margin-top: 0; font-size: 24px;">New Cleaning Jobs Assigned</h1>
            <p style="color: #4b5563; font-size: 16px;">You have been assigned ${jobs.length} new cleaning job${jobs.length > 1 ? 's' : ''}.</p>
            
            ${jobsHtml}
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 14px; margin: 0;">Please log in to your account to view full details and update job status.</p>
            </div>
          </div>
        </body>
      </html>
    `

    const textContent = `New Cleaning Jobs Assigned\n\nYou have been assigned ${jobs.length} new cleaning job${jobs.length > 1 ? 's' : ''}.\n\n${jobs.map((job: any, index: number) => {
      const date = format(new Date(job.cleaning_date), 'EEEE, MMMM dd, yyyy at h:mm a')
      return `Job ${index + 1}: ${job.property_name}
Property: ${job.property_name}
Address: ${job.property_address || 'N/A'}
Date & Time: ${date}
${job.cost ? `Cost: $${job.cost.toFixed(2)}` : ''}
${job.notes ? `Notes: ${job.notes}` : ''}
`
    }).join('\n---\n\n')}`

    // Send email using the email service
    const subject = `New Cleaning Job${jobs.length > 1 ? 's' : ''} Assigned (${jobs.length})`
    
    console.log('Attempting to send email to:', cleaner_email)
    console.log('Email service configured:', {
      hasResendKey: !!process.env.RESEND_API_KEY,
      fromEmail: process.env.FROM_EMAIL
    })

    const emailResult = await emailService.sendEmail({
      to: {
        email: cleaner_email,
        name: 'Cleaner' // You could fetch the cleaner's name if needed
      },
      subject: subject,
      html: htmlContent,
      text: textContent
      // Note: tags removed - Resend validation may fail with them
    })

    console.log('Email result:', emailResult)

    if (!emailResult.success) {
      console.error('Failed to send email:', emailResult.error)
      
      // Log failed email attempt
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        
        if (supabaseUrl && supabaseServiceKey) {
          const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
              autoRefreshToken: false,
              persistSession: false
            }
          })

          let cleanerName = 'Cleaner'
          if (cleaner_id) {
            const { data: cleanerProfile } = await supabaseAdmin
              .from('user_profiles')
              .select('full_name')
              .eq('id', cleaner_id)
              .single()
            if (cleanerProfile?.full_name) {
              cleanerName = cleanerProfile.full_name
            }
          }

          await supabaseAdmin
            .from('cleaning_email_logs')
            .insert({
              cleaner_id: cleaner_id || null,
              cleaner_email: cleaner_email,
              cleaner_name: cleanerName,
              subject: subject,
              email_content: htmlContent,
              cleaning_ids: cleaning_ids || [],
              status: 'failed',
              error_message: emailResult.error || 'Unknown error'
            })
        }
      } catch (logError) {
        console.error('Failed to log email error:', logError)
      }
      
      return NextResponse.json({
        success: false,
        error: emailResult.error || 'Failed to send email. Please check your email service configuration (RESEND_API_KEY and FROM_EMAIL).'
      }, { status: 500 })
    }

    console.log('Email sent successfully:', emailResult.messageId)

    // Log the email to the database
    console.log('Attempting to log email to database...')
    let loggedSuccessfully = false
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      
      console.log('Supabase config:', {
        hasUrl: !!supabaseUrl,
        hasServiceKey: !!supabaseServiceKey
      })
      
      if (!supabaseUrl || !supabaseServiceKey) {
        console.error('Missing Supabase credentials for logging')
        // Still return success for email, but log the issue
      } else {
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        })

        // Get cleaner name if possible
        let cleanerName = 'Cleaner'
        if (cleaner_id) {
          try {
            const { data: cleanerProfile, error: profileError } = await supabaseAdmin
              .from('user_profiles')
              .select('full_name')
              .eq('id', cleaner_id)
              .single()
            
            if (profileError) {
              console.warn('Could not fetch cleaner profile:', profileError)
            } else if (cleanerProfile?.full_name) {
              cleanerName = cleanerProfile.full_name
            }
          } catch (err) {
            console.warn('Error fetching cleaner profile:', err)
          }
        }

        console.log('Inserting email log with data:', {
          cleaner_email: cleaner_email,
          cleaner_name: cleanerName,
          subject: subject.substring(0, 50),
          status: emailResult.success ? 'sent' : 'failed',
          has_message_id: !!emailResult.messageId
        })

        const { data: insertedData, error: insertError } = await supabaseAdmin
          .from('cleaning_email_logs')
          .insert({
            cleaner_id: cleaner_id || null,
            cleaner_email: cleaner_email,
            cleaner_name: cleanerName,
            subject: subject,
            email_content: htmlContent,
            cleaning_ids: cleaning_ids || [],
            status: emailResult.success ? 'sent' : 'failed',
            provider_message_id: emailResult.messageId || null,
            error_message: emailResult.error || null
          })
          .select()

        if (insertError) {
          console.error('Failed to log email to database:', insertError)
          console.error('Error details:', {
            code: insertError.code,
            message: insertError.message,
            details: insertError.details,
            hint: insertError.hint
          })
          if (insertError.code === '42P01') {
            console.error('ERROR: cleaning_email_logs table does not exist! Please run the SQL migration.')
          }
        } else {
          loggedSuccessfully = true
          console.log('Email logged to database successfully:', insertedData?.[0]?.id)
        }
      }
    } catch (logError: any) {
      console.error('Exception while logging email:', logError)
      console.error('Error stack:', logError.stack)
      if (logError?.code === '42P01') {
        console.error('ERROR: cleaning_email_logs table does not exist! Please run: scripts/create-email-logs-table.sql')
      }
      // Don't fail the request if logging fails
    }

    const response = {
      success: true,
      message: `Successfully sent ${jobs.length} cleaning job(s) to ${cleaner_email}`,
      emailId: emailResult.messageId,
      logged: loggedSuccessfully
    }
    console.log('=== API RESPONSE ===', response)
    return NextResponse.json(response)

  } catch (error: any) {
    console.error('Send cleaning jobs error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to send cleaning jobs' },
      { status: 500 }
    )
  }
}

