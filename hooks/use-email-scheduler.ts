'use client'

import { useState, useEffect, useCallback } from 'react'
import { emailScheduler, ScheduledEmail } from '@/lib/email-scheduler'
import { BookingWithProperty } from '@/lib/bookings'

interface UseScheduledEmailsOptions {
  booking_id?: string
  email_type?: string
  status?: string
  autoRefresh?: boolean
}

interface UseScheduledEmailsReturn {
  emails: ScheduledEmail[]
  loading: boolean
  error: string | null
  stats: {
    total: number
    pending: number
    sent: number
    failed: number
    cancelled: number
  }
  refetch: () => Promise<void>
}

export function useScheduledEmails(options: UseScheduledEmailsOptions = {}): UseScheduledEmailsReturn {
  const [emails, setEmails] = useState<ScheduledEmail[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState({
    total: 0, pending: 0, sent: 0, failed: 0, cancelled: 0
  })

  const fetchEmails = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      if (options.booking_id) {
        // Fetch emails for specific booking
        const result = await emailScheduler.getBookingEmails(options.booking_id)
        
        if (result.error) {
          setError(result.error)
          return
        }

        setEmails(result.data)
      }

      // Fetch stats
      const emailStats = await emailScheduler.getEmailStats(options.booking_id)
      setStats(emailStats)

    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }, [options.booking_id])

  useEffect(() => {
    fetchEmails()
  }, [fetchEmails])

  // Auto refresh every 30 seconds if enabled
  useEffect(() => {
    if (!options.autoRefresh) return

    const interval = setInterval(() => {
      fetchEmails()
    }, 30000)

    return () => clearInterval(interval)
  }, [options.autoRefresh, fetchEmails])

  return {
    emails,
    loading,
    error,
    stats,
    refetch: fetchEmails
  }
}

interface UseEmailActionsReturn {
  scheduleBookingEmails: (booking: BookingWithProperty) => Promise<{ success: boolean; error?: string }>
  cancelBookingEmails: (bookingId: string) => Promise<{ success: boolean; error?: string }>
  sendEmailNow: (emailType: 'check_in_instructions' | 'checkout_reminder' | 'thank_you_review', booking: BookingWithProperty) => Promise<{ success: boolean; error?: string }>
  processEmails: () => Promise<{ success: boolean; stats?: any; error?: string }>
  loading: boolean
}

export function useEmailActions(): UseEmailActionsReturn {
  const [loading, setLoading] = useState(false)

  const scheduleBookingEmails = useCallback(async (booking: BookingWithProperty) => {
    setLoading(true)
    try {
      const result = await emailScheduler.scheduleBookingEmails(booking)
      
      if (result.success) {
        console.log(`Scheduled ${result.scheduled_emails?.length || 0} emails for booking ${booking.id}`)
      }

      return result

    } catch (err) {
      return { success: false, error: String(err) }
    } finally {
      setLoading(false)
    }
  }, [])

  const cancelBookingEmails = useCallback(async (bookingId: string) => {
    setLoading(true)
    try {
      const result = await emailScheduler.cancelBookingEmails(bookingId)
      return result

    } catch (err) {
      return { success: false, error: String(err) }
    } finally {
      setLoading(false)
    }
  }, [])

  const sendEmailNow = useCallback(async (
    emailType: 'check_in_instructions' | 'checkout_reminder' | 'thank_you_review',
    booking: BookingWithProperty
  ) => {
    setLoading(true)
    try {
      const response = await fetch('/api/emails/send-now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_id: booking.id, email_type: emailType })
      })
      const data = await response.json()
      if (!response.ok) {
        return { success: false, error: data.error || 'Failed to send' }
      }
      return { success: true }
    } catch (err) {
      return { success: false, error: String(err) }
    } finally {
      setLoading(false)
    }
  }, [])

  const processEmails = useCallback(async () => {
    setLoading(true)
    try {
      // Call the API endpoint to process emails
      const response = await fetch('/api/process-emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'process_pending' })
      })

      const data = await response.json()

      if (!response.ok) {
        return { success: false, error: data.error }
      }

      return { success: true, stats: data.stats }

    } catch (err) {
      return { success: false, error: String(err) }
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    scheduleBookingEmails,
    cancelBookingEmails,
    sendEmailNow,
    processEmails,
    loading
  }
}

// Convenience hook for booking email status
export function useBookingEmailStatus(bookingId: string) {
  const { emails, loading, error, refetch } = useScheduledEmails({ booking_id: bookingId })

  const emailStatus = {
    check_in_instructions: emails.find(e => e.email_type === 'check_in_instructions'),
    checkout_reminder: emails.find(e => e.email_type === 'checkout_reminder'),
    thank_you_review: emails.find(e => e.email_type === 'thank_you_review')
  }

  const getEmailStatusSummary = () => {
    const total = emails.length
    const sent = emails.filter(e => e.status === 'sent').length
    const pending = emails.filter(e => e.status === 'pending').length
    const failed = emails.filter(e => e.status === 'failed').length

    return { total, sent, pending, failed }
  }

  return {
    emails,
    emailStatus,
    summary: getEmailStatusSummary(),
    loading,
    error,
    refetch
  }
}