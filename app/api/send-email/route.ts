import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { emailService } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const { to, subject, message, html } = await request.json()

    if (!to || !subject || (!message && !html)) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: to, subject, message or html' },
        { status: 400 }
      )
    }

    // Send email using the email service (Resend)
    console.log('Sending email via Resend:', { to, subject })
    
    const emailResult = await emailService.sendEmail({
      to: {
        email: to,
        name: to.split('@')[0] // Use email prefix as name
      },
      subject: subject,
      html: html || (message ? `<p>${message.replace(/\n/g, '<br>')}</p>` : ''),
      text: message
    })

    if (!emailResult.success) {
      console.error('Failed to send email:', emailResult.error)
      return NextResponse.json({
        success: false,
        error: emailResult.error || 'Failed to send email'
      }, { status: 500 })
    }

    console.log('Email sent successfully via Resend:', emailResult.messageId)
    
    // Log the email to the database if it's a cleaning-related email
    let loggedSuccessfully = false
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      
      if (supabaseUrl && supabaseServiceKey && to) {
        const supabaseAdmin = createSupabaseAdmin(supabaseUrl, supabaseServiceKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        })

        console.log('Attempting to log email for:', to)
        
        // Try to find cleaner by email
        const { data: cleanerProfile, error: profileError } = await supabaseAdmin
          .from('user_profiles')
          .select('id, full_name, role')
          .eq('email', to)
          .eq('role', 'cleaner')
          .maybeSingle()

        console.log('Cleaner profile lookup:', { 
          found: !!cleanerProfile, 
          error: profileError?.message,
          email: to 
        })

        // Log all emails, not just to cleaners
        console.log('Inserting email log...')
        const { data: insertedData, error: insertError } = await supabaseAdmin
          .from('cleaning_email_logs')
            .insert({
              cleaner_id: cleanerProfile?.id || null,
              cleaner_email: to,
              cleaner_name: cleanerProfile?.full_name || null,
              subject: subject,
              email_content: html || message,
              cleaning_ids: [],
              status: emailResult.success ? 'sent' : 'failed',
              provider_message_id: emailResult.messageId || null,
              error_message: emailResult.error || null
            })
          .select()

        if (!insertError) {
          loggedSuccessfully = true
          console.log('✅ Email logged to database successfully:', insertedData?.[0]?.id)
        } else {
          console.error('❌ Failed to log email:', insertError)
          console.error('Error details:', {
            code: insertError.code,
            message: insertError.message,
            details: insertError.details,
            hint: insertError.hint
          })
        }
      }
    } catch (logError) {
      console.error('Error logging email:', logError)
    }
    
    return NextResponse.json({
      success: true,
      message: 'Email sent successfully',
      emailId: emailResult.messageId,
      logged: loggedSuccessfully
    })

  } catch (error: any) {
    console.error('Send email error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to send email' },
      { status: 500 }
    )
  }
}

