import { createClient } from '@/lib/supabase'
import { BookingWithProperty } from '@/lib/bookings'
import { guestCheckinService } from '@/lib/guest-checkin'
import { addDays, subDays, isAfter, isBefore, startOfDay, format } from 'date-fns'

export interface ScheduledEmail {
  id?: string
  booking_id: string
  email_type: 'check_in_instructions' | 'checkout_reminder' | 'thank_you_review'
  recipient_email: string
  recipient_name: string
  scheduled_for: Date
  sent_at?: Date
  status: 'pending' | 'sent' | 'failed' | 'cancelled'
  error_message?: string
  retry_count: number
  created_at?: Date
  updated_at?: Date
}

export interface EmailScheduleResult {
  success: boolean
  scheduled_emails?: ScheduledEmail[]
  error?: string
}

export class EmailScheduler {
  private getSupabaseClient() {
    const client = createClient()
    if (!client) throw new Error('Supabase client not available')
    return client
  }

  /**
   * Schedule all automated emails for a booking
   */
  async scheduleBookingEmails(booking: BookingWithProperty): Promise<EmailScheduleResult> {
    try {
      if (!booking.contact_email) {
        return { success: false, error: 'No guest email provided' }
      }

      const now = new Date()
      const checkInDate = new Date(booking.check_in)
      const checkOutDate = new Date(booking.check_out)

      const scheduled_emails: ScheduledEmail[] = []

      // 1. Check-in instructions (2 days before check-in)
      const checkInEmailDate = subDays(checkInDate, 2)
      if (isAfter(checkInEmailDate, now)) {
        scheduled_emails.push({
          booking_id: booking.id,
          email_type: 'check_in_instructions',
          recipient_email: booking.contact_email,
          recipient_name: booking.guest_name,
          scheduled_for: checkInEmailDate,
          status: 'pending',
          retry_count: 0
        })
      }

      // 2. Checkout reminder (1 day before checkout)
      const checkoutReminderDate = subDays(checkOutDate, 1)
      if (isAfter(checkoutReminderDate, now)) {
        scheduled_emails.push({
          booking_id: booking.id,
          email_type: 'checkout_reminder',
          recipient_email: booking.contact_email,
          recipient_name: booking.guest_name,
          scheduled_for: checkoutReminderDate,
          status: 'pending',
          retry_count: 0
        })
      }

      // 3. Thank you and review request (2 days after checkout)
      const thankYouEmailDate = addDays(checkOutDate, 2)
      scheduled_emails.push({
        booking_id: booking.id,
        email_type: 'thank_you_review',
        recipient_email: booking.contact_email,
        recipient_name: booking.guest_name,
        scheduled_for: thankYouEmailDate,
        status: 'pending',
        retry_count: 0
      })

      // Save scheduled emails to database
      if (scheduled_emails.length > 0) {
        const result = await this.saveScheduledEmails(scheduled_emails)
        if (!result.success) {
          return { success: false, error: result.error }
        }
      }

      console.log(`Scheduled ${scheduled_emails.length} emails for booking ${booking.id}`)
      return { success: true, scheduled_emails }

    } catch (error) {
      console.error('Email scheduling error:', error)
      return { success: false, error: String(error) }
    }
  }

  /**
   * Cancel scheduled emails for a booking
   */
  async cancelBookingEmails(bookingId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = this.getSupabaseClient()

      const { error } = await supabase
        .from('scheduled_emails')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('booking_id', bookingId)
        .eq('status', 'pending')

      if (error) {
        console.error('Error cancelling emails:', error)
        return { success: false, error: error.message }
      }

      console.log(`Cancelled scheduled emails for booking ${bookingId}`)
      return { success: true }

    } catch (error) {
      console.error('Cancel emails error:', error)
      return { success: false, error: String(error) }
    }
  }

  /**
   * Process pending emails that are due to be sent
   */
  async processPendingEmails(): Promise<{ processed: number; sent: number; failed: number }> {
    try {
      // Ensure this only runs on the server to avoid bundling email provider in client
      if (typeof window !== 'undefined') {
        console.warn('processPendingEmails called on client; skipping')
        return { processed: 0, sent: 0, failed: 0 }
      }

      const { emailService } = await import('@/lib/email')
      const supabase = this.getSupabaseClient()
      const now = new Date()

      // Get pending emails that are due
      const { data: pendingEmails, error } = await supabase
        .from('scheduled_emails')
        .select(`
          *,
          bookings!inner(
            id,
            property_id,
            guest_name,
            contact_email,
            check_in,
            check_out,
            notes,
            booking_platform,
            properties!inner(
              name,
              address
            )
          )
        `)
        .eq('status', 'pending')
        .lte('scheduled_for', now.toISOString())
        .order('scheduled_for', { ascending: true })
        .limit(50) // Process in batches

      if (error) {
        console.error('Error fetching pending emails:', error)
        return { processed: 0, sent: 0, failed: 0 }
      }

      if (!pendingEmails || pendingEmails.length === 0) {
        return { processed: 0, sent: 0, failed: 0 }
      }

      let sent = 0
      let failed = 0

      for (const scheduledEmail of pendingEmails) {
        try {
          const booking = scheduledEmail.bookings
          const property = booking.properties

          // Generate guest check-in token and URL for check-in instructions
          let guestCheckinInfo = { checkin_url: null, link_expires: null }
          if (scheduledEmail.email_type === 'check_in_instructions') {
            const tokenResult = await guestCheckinService.generateTokenForEmail(booking.id, 30)
            if (!tokenResult.error) {
              guestCheckinInfo = {
                checkin_url: tokenResult.checkin_url,
                link_expires: tokenResult.link_expires
              }
            }
          }

          // Prepare booking data for email templates
          const bookingData = {
            id: booking.id,
            property_name: property.name,
            property_address: property.address,
            check_in: booking.check_in,
            check_out: booking.check_out,
            notes: booking.notes,
            booking_platform: booking.booking_platform,
            guest_checkin_url: guestCheckinInfo.checkin_url,
            link_expires: guestCheckinInfo.link_expires ? format(new Date(guestCheckinInfo.link_expires), 'MMMM dd, yyyy') : null
          }

          const guest = {
            email: scheduledEmail.recipient_email,
            name: scheduledEmail.recipient_name
          }

          let emailResult

          // Send appropriate email based on type
          switch (scheduledEmail.email_type) {
            case 'check_in_instructions':
              emailResult = await emailService.sendCheckInInstructions(guest, bookingData)
              break
            case 'checkout_reminder':
              emailResult = await emailService.sendCheckoutReminder(guest, bookingData)
              break
            case 'thank_you_review':
              emailResult = await emailService.sendThankYouAndReview(guest, bookingData)
              break
            default:
              throw new Error(`Unknown email type: ${scheduledEmail.email_type}`)
          }

          // Update email status based on result
          if (emailResult.success) {
            await supabase
              .from('scheduled_emails')
              .update({
                status: 'sent',
                sent_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('id', scheduledEmail.id)

            sent++
            console.log(`Sent ${scheduledEmail.email_type} email for booking ${booking.id}`)
          } else {
            // Handle failure - retry up to 3 times
            const newRetryCount = scheduledEmail.retry_count + 1
            const shouldRetry = newRetryCount <= 3

            await supabase
              .from('scheduled_emails')
              .update({
                status: shouldRetry ? 'pending' : 'failed',
                retry_count: newRetryCount,
                error_message: emailResult.error,
                scheduled_for: shouldRetry ? addDays(new Date(), 1).toISOString() : scheduledEmail.scheduled_for,
                updated_at: new Date().toISOString()
              })
              .eq('id', scheduledEmail.id)

            failed++
            console.error(`Failed to send ${scheduledEmail.email_type} email for booking ${booking.id}:`, emailResult.error)
          }

        } catch (error) {
          console.error(`Error processing email ${scheduledEmail.id}:`, error)
          
          // Mark as failed
          await supabase
            .from('scheduled_emails')
            .update({
              status: 'failed',
              error_message: String(error),
              updated_at: new Date().toISOString()
            })
            .eq('id', scheduledEmail.id)

          failed++
        }
      }

      console.log(`Email processing complete: ${pendingEmails.length} processed, ${sent} sent, ${failed} failed`)
      return { processed: pendingEmails.length, sent, failed }

    } catch (error) {
      console.error('Process emails error:', error)
      return { processed: 0, sent: 0, failed: 0 }
    }
  }

  /**
   * Get scheduled emails for a booking
   */
  async getBookingEmails(bookingId: string): Promise<{ data: ScheduledEmail[]; error?: string }> {
    try {
      const supabase = this.getSupabaseClient()

      const { data, error } = await supabase
        .from('scheduled_emails')
        .select('*')
        .eq('booking_id', bookingId)
        .order('scheduled_for', { ascending: true })

      if (error) {
        console.error('Error fetching booking emails:', error)
        return { data: [], error: error.message }
      }

      return { data: data || [] }

    } catch (error) {
      console.error('Get booking emails error:', error)
      return { data: [], error: String(error) }
    }
  }

  /**
   * Manually trigger an email for a booking
   */
  async sendEmailNow(
    emailType: 'check_in_instructions' | 'checkout_reminder' | 'thank_you_review',
    booking: BookingWithProperty
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Only available on server to prevent bundling email provider client-side
      if (typeof window !== 'undefined') {
        return { success: false, error: 'Send now is only available on the server' }
      }

      const { emailService } = await import('@/lib/email')
      if (!booking.contact_email) {
        return { success: false, error: 'No guest email provided' }
      }

      const guest = {
        email: booking.contact_email,
        name: booking.guest_name
      }

      const bookingData = {
        id: booking.id,
        property_name: booking.property_name || 'Property',
        property_address: booking.property_address || '',
        check_in: booking.check_in,
        check_out: booking.check_out,
        notes: booking.notes,
        booking_platform: booking.booking_platform
      }

      let result

      switch (emailType) {
        case 'check_in_instructions':
          result = await emailService.sendCheckInInstructions(guest, bookingData)
          break
        case 'checkout_reminder':
          result = await emailService.sendCheckoutReminder(guest, bookingData)
          break
        case 'thank_you_review':
          result = await emailService.sendThankYouAndReview(guest, bookingData)
          break
        default:
          return { success: false, error: `Unknown email type: ${emailType}` }
      }

      return result

    } catch (error) {
      console.error('Send email now error:', error)
      return { success: false, error: String(error) }
    }
  }

  /**
   * Save scheduled emails to database
   */
  private async saveScheduledEmails(emails: ScheduledEmail[]): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = this.getSupabaseClient()

      const insertData = emails.map(email => ({
        booking_id: email.booking_id,
        email_type: email.email_type,
        recipient_email: email.recipient_email,
        recipient_name: email.recipient_name,
        scheduled_for: email.scheduled_for.toISOString(),
        status: email.status,
        retry_count: email.retry_count,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }))

      const { error } = await supabase
        .from('scheduled_emails')
        .insert(insertData)

      if (error) {
        console.error('Error saving scheduled emails:', error)
        return { success: false, error: error.message }
      }

      return { success: true }

    } catch (error) {
      console.error('Save emails error:', error)
      return { success: false, error: String(error) }
    }
  }

  /**
   * Get email statistics
   */
  async getEmailStats(bookingId?: string): Promise<{
    total: number
    pending: number
    sent: number
    failed: number
    cancelled: number
  }> {
    try {
      const supabase = this.getSupabaseClient()

      let query = supabase
        .from('scheduled_emails')
        .select('status')

      if (bookingId) {
        query = query.eq('booking_id', bookingId)
      }

      const { data, error } = await query

      if (error || !data) {
        return { total: 0, pending: 0, sent: 0, failed: 0, cancelled: 0 }
      }

      const stats = data.reduce((acc, email) => {
        acc.total++
        acc[email.status as keyof typeof acc] = (acc[email.status as keyof typeof acc] as number) + 1
        return acc
      }, { total: 0, pending: 0, sent: 0, failed: 0, cancelled: 0 })

      return stats

    } catch (error) {
      console.error('Email stats error:', error)
      return { total: 0, pending: 0, sent: 0, failed: 0, cancelled: 0 }
    }
  }
}

// Export singleton instance
export const emailScheduler = new EmailScheduler()