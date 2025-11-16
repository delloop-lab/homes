'use client'

import { useState } from 'react'
import { useBookingEmailStatus, useEmailActions } from '@/hooks/use-email-scheduler'
import { BookingWithProperty } from '@/lib/bookings'
import { format } from 'date-fns'
import { emailToLink } from '@/lib/email-utils'
import { 
  Mail, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Send,
  Loader2,
  RefreshCw,
  Calendar,
  Eye
} from 'lucide-react'

interface EmailStatusProps {
  booking: BookingWithProperty
  showActions?: boolean
}

export function EmailStatus({ booking, showActions = true }: EmailStatusProps) {
  const { emails, emailStatus, summary, loading, refetch } = useBookingEmailStatus(booking.id)
  const { scheduleBookingEmails, sendEmailNow, cancelBookingEmails, loading: actionLoading } = useEmailActions()
  const [actionResult, setActionResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-gray-600" />
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getEmailTypeLabel = (type: string) => {
    switch (type) {
      case 'check_in_instructions':
        return 'Check-in Instructions'
      case 'checkout_reminder':
        return 'Checkout Reminder'
      case 'thank_you_review':
        return 'Thank You & Review'
      default:
        return type
    }
  }

  const handleScheduleEmails = async () => {
    const result = await scheduleBookingEmails(booking)
    
    if (result.success) {
      setActionResult({ type: 'success', message: 'Emails scheduled successfully!' })
      refetch()
    } else {
      setActionResult({ type: 'error', message: result.error || 'Failed to schedule emails' })
    }

    setTimeout(() => setActionResult(null), 5000)
  }

  const handleSendEmailNow = async (emailType: 'check_in_instructions' | 'checkout_reminder' | 'thank_you_review') => {
    const result = await sendEmailNow(emailType, booking)
    
    if (result.success) {
      setActionResult({ type: 'success', message: `${getEmailTypeLabel(emailType)} sent successfully!` })
      refetch()
    } else {
      setActionResult({ type: 'error', message: result.error || 'Failed to send email' })
    }

    setTimeout(() => setActionResult(null), 5000)
  }

  const handleCancelEmails = async () => {
    if (!confirm('Are you sure you want to cancel all pending emails for this booking?')) {
      return
    }

    const result = await cancelBookingEmails(booking.id)
    
    if (result.success) {
      setActionResult({ type: 'success', message: 'Pending emails cancelled successfully!' })
      refetch()
    } else {
      setActionResult({ type: 'error', message: result.error || 'Failed to cancel emails' })
    }

    setTimeout(() => setActionResult(null), 5000)
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center space-x-2 mb-4">
          <Mail className="h-5 w-5 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900">Email Status</h3>
        </div>
        <div className="animate-pulse space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Mail className="h-5 w-5 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900">Email Status</h3>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={refetch}
            disabled={loading}
            className="p-1 text-gray-400 hover:text-gray-600"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {summary.total > 0 && (
            <span className="text-sm text-gray-500">
              {summary.sent}/{summary.total} sent
            </span>
          )}
        </div>
      </div>

      {/* Action Result Message */}
      {actionResult && (
        <div className={`mb-4 p-3 rounded-lg border ${
          actionResult.type === 'success' 
            ? 'bg-green-50 border-green-200 text-green-700' 
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {actionResult.message}
        </div>
      )}

      {/* Email List */}
      {emails.length === 0 ? (
        <div className="text-center py-6">
          <Mail className="h-8 w-8 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500 mb-4">No emails scheduled for this booking</p>
          {showActions && booking.contact_email && (
            <button
              onClick={handleScheduleEmails}
              disabled={actionLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
              ) : (
                <Send className="h-4 w-4 inline mr-2" />
              )}
              Schedule Emails
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {[
            { type: 'check_in_instructions', label: 'Check-in Instructions' },
            { type: 'checkout_reminder', label: 'Checkout Reminder' },
            { type: 'thank_you_review', label: 'Thank You & Review' }
          ].map(({ type, label }) => {
            const email = emailStatus[type as keyof typeof emailStatus]
            
            return (
              <div key={type} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  {email ? getStatusIcon(email.status) : <AlertTriangle className="h-4 w-4 text-gray-400" />}
                  <div>
                    <div className="font-medium text-gray-900">{label}</div>
                    {email ? (
                      <div className="text-sm text-gray-500">
                        {email.status === 'sent' && email.sent_at && (
                          <>Sent {format(new Date(email.sent_at), 'MMM dd, h:mm a')}</>
                        )}
                        {email.status === 'pending' && (
                          <>Scheduled for {format(new Date(email.scheduled_for), 'MMM dd, h:mm a')}</>
                        )}
                        {email.status === 'failed' && (
                          <>Failed: {email.error_message}</>
                        )}
                        {email.status === 'cancelled' && (
                          <>Cancelled</>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500">Not scheduled</div>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {email && (
                    <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(email.status)}`}>
                      {email.status}
                    </span>
                  )}
                  
                  {showActions && booking.contact_email && (
                    <button
                      onClick={() => handleSendEmailNow(type as any)}
                      disabled={actionLoading}
                      className="text-blue-600 hover:text-blue-500 text-sm font-medium disabled:opacity-50"
                      title="Send now"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Action Buttons */}
      {showActions && emails.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between">
          <button
            onClick={handleCancelEmails}
            disabled={actionLoading || summary.pending === 0}
            className="text-red-600 hover:text-red-500 text-sm font-medium disabled:opacity-50"
          >
            Cancel Pending ({summary.pending})
          </button>
          
          <div className="text-sm text-gray-500">
            {summary.failed > 0 && (
              <span className="text-red-600">{summary.failed} failed</span>
            )}
          </div>
        </div>
      )}

      {/* Guest Email Info */}
      {booking.contact_email && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            <strong>Guest Email:</strong> {emailToLink(booking.contact_email)}
          </div>
        </div>
      )}
    </div>
  )
}