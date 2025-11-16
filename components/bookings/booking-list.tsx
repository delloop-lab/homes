'use client'

import { useState, useEffect } from 'react'
import { useBookings } from '@/hooks/use-bookings'
import { BookingWithProperty } from '@/lib/bookings'
import { EmailStatus } from '@/components/bookings/email-status'
import { format } from 'date-fns'
import { MapPin, User, Calendar as CalendarIcon, Clock, Edit, Mail, CheckCircle, XCircle, X, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { BookingForm } from '@/components/bookings/booking-form'
import { formatPlatformName } from '@/lib/booking-platforms'
import { emailToLink } from '@/lib/email-utils'

// Currency symbol mapping
const getCurrencySymbol = (currencyCode?: string | null): string => {
  const currencyMap: Record<string, string> = {
    'USD': '$',
    'EUR': '€',
    'GBP': '£',
    'AUD': 'A$',
    'CAD': 'C$',
    'JPY': '¥',
    'CHF': 'CHF',
    'CNY': '¥',
    'INR': '₹',
    'BRL': 'R$',
    'MXN': '$',
    'ZAR': 'R',
    'NZD': 'NZ$',
    'SGD': 'S$',
    'HKD': 'HK$',
    'SEK': 'kr',
    'NOK': 'kr',
    'DKK': 'kr',
    'PLN': 'zł',
    'TRY': '₺',
    'RUB': '₽'
  }
  return currencyMap[(currencyCode || '').toUpperCase()] || currencyCode || '$'
}

interface BookingListProps {
  propertyId?: string
  isReadOnly?: boolean
}

export function BookingList({ propertyId, isReadOnly = false }: BookingListProps) {
  const { bookings, loading, error, refetch, loadMore, hasMore } = useBookings({
    property_id: propertyId,
    limit: 20,
    autoRefresh: true
  })
  const [selected, setSelected] = useState<BookingWithProperty | null>(null)
  const [showBookingForm, setShowBookingForm] = useState(false)
  const [emailLogs, setEmailLogs] = useState<any[]>([])
  const [showEmailLogs, setShowEmailLogs] = useState(false)
  const [loadingEmails, setLoadingEmails] = useState(false)
  const [emailFilter, setEmailFilter] = useState('')
  const [emailTypeFilter, setEmailTypeFilter] = useState<string>('all')

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      case 'checked_in': return 'bg-blue-100 text-blue-800'
      case 'checked_out': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // Load email logs for selected booking
  const loadEmailLogs = async (bookingId: string) => {
    setLoadingEmails(true)
    try {
      const supabase = createClient()
      if (!supabase) return

      const { data, error } = await supabase
        .from('cleaning_email_logs')
        .select('*')
        .eq('booking_id', bookingId)
        .order('sent_at', { ascending: false })

      if (!error && data) {
        setEmailLogs(data)
      }
    } catch (err) {
      console.error('Error loading email logs:', err)
    } finally {
      setLoadingEmails(false)
    }
  }

  // Load email logs when a booking is selected
  useEffect(() => {
    if (selected?.id) {
      loadEmailLogs(selected.id)
    } else {
      setEmailLogs([])
    }
  }, [selected?.id])

  // Delete email log
  const handleDeleteEmailLog = async (logId: string) => {
    if (!confirm('Are you sure you want to delete this email log? This action cannot be undone.')) {
      return
    }

    try {
      const supabase = createClient()
      if (!supabase) return

      const { data, error } = await supabase
        .from('cleaning_email_logs')
        .delete()
        .eq('id', logId)
        .select()

      if (error) {
        console.error('Error deleting email log:', error)
        alert(`Failed to delete email log: ${error.message || error}. Please check RLS policies.`)
      } else {
        console.log('Email log deleted successfully:', data)
        // Reload email logs
        if (selected?.id) {
          await loadEmailLogs(selected.id)
        }
        // Also update the local state immediately for better UX
        setEmailLogs(prev => prev.filter(log => log.id !== logId))
      }
    } catch (err) {
      console.error('Error deleting email log:', err)
      alert('Failed to delete email log. Please try again.')
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-4 flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Bookings</h3>
        <button
          onClick={refetch}
          disabled={loading}
          className="text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50"
        >
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="mx-4 mb-3 p-3 rounded bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {loading && bookings.length === 0 ? (
        <div className="px-4 pb-4 text-gray-500">Loading…</div>
      ) : bookings.length === 0 ? (
        <div className="px-4 pb-4 text-gray-500">No bookings found</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Guest</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Property</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check-in</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check-out</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Platform</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {bookings.map((b) => (
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">{b.guest_name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{b.property_name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{format(new Date(b.check_in), 'MMM dd, yyyy')}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{format(new Date(b.check_out), 'MMM dd, yyyy')}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 capitalize">{b.booking_platform || 'manual'}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => { setSelected(b); setShowBookingForm(false) }}
                      className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded"
                    >
                      View details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {hasMore && (
        <div className="p-4 text-center">
          <button
            onClick={loadMore}
            disabled={loading}
            className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded disabled:opacity-50"
          >
            {loading ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}

      {selected && !showBookingForm && (
        <div className="fixed inset-0 z-[1000]">
          <div className="absolute inset-0 bg-black/30" onClick={() => setSelected(null)} />
          <div className="relative max-w-2xl w-full mx-auto mt-16 bg-white rounded-lg shadow-lg border border-gray-200 max-h-[85vh] overflow-y-auto">
            <div className="p-4 border-b flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div>
                  <div className="text-lg font-semibold text-gray-900">Booking details</div>
                  <div className="text-sm text-gray-500">{selected.guest_name} • {selected.property_name}</div>
                </div>
                {emailLogs.length > 0 ? (
                  <button
                    onClick={() => setShowEmailLogs(true)}
                    className="relative p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-full transition-colors"
                    title={`${emailLogs.length} email${emailLogs.length > 1 ? 's' : ''} sent (includes cleaning and guest emails)`}
                  >
                    <Mail className="h-5 w-5" />
                    <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-semibold">
                      {emailLogs.length}
                    </span>
                  </button>
                ) : (
                  <span className="text-xs text-gray-400" title="No emails sent yet">
                    <Mail className="h-4 w-4 opacity-50" />
                  </span>
                )}
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-500 hover:text-gray-700 text-sm">Close</button>
            </div>
            <div className="p-4 space-y-4">
              {/* Guest Info */}
              <div className="flex items-start space-x-3">
                <User className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <div className="font-medium text-gray-900">{selected.guest_name}</div>
                  {!isReadOnly && selected.contact_email && (
                    <div className="text-sm text-gray-500">{selected.contact_email}</div>
                  )}
                  {!isReadOnly && selected.contact_phone && (
                    <div className="text-sm text-gray-500">{selected.contact_phone}</div>
                  )}
                </div>
              </div>

              {/* Property Info */}
              <div className="flex items-start space-x-3">
                <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <div className="font-medium text-gray-900">{selected.property_name}</div>
                  {selected.property_address && (
                    <div className="text-sm text-gray-500">{selected.property_address}</div>
                  )}
                </div>
              </div>

              {/* Dates */}
              <div className="flex items-start space-x-3">
                <CalendarIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <div className="font-medium text-gray-900">
                    {format(new Date(selected.check_in), 'MMM dd, yyyy')} - {format(new Date(selected.check_out), 'MMM dd, yyyy')}
                  </div>
                  <div className="text-sm text-gray-500 flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    {selected.nights} {selected.nights === 1 ? 'night' : 'nights'}
                  </div>
                </div>
              </div>

              {/* Status */}
              <div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selected.status)}`}>
                  {selected.status.replace('_', ' ')}
                </span>
              </div>

              {/* Financial Breakdown - Hidden for cleaners */}
              {!isReadOnly && selected.total_amount && (() => {
                const currency = (selected as any)?.currency || 'USD'
                const currencySymbol = getCurrencySymbol(currency)
                const commission = (selected as any)?.commission_and_charges || 0
                const payout = Math.max(0, (selected.total_amount || 0) - commission)
                
                return (
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="text-sm font-medium text-gray-700 mb-3">Financial Details</div>
                    <div className="space-y-2">
                      {/* Total Amount */}
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Total Amount:</span>
                        <span className="text-base font-semibold text-gray-900">
                          {currencySymbol}{selected.total_amount.toFixed(2)}
                        </span>
                      </div>
                      
                      {/* Commission & Charges */}
                      {commission > 0 && (
                        <>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Commission & Charges:</span>
                            <span className="text-base font-semibold text-red-600">
                              -{currencySymbol}{commission.toFixed(2)}
                            </span>
                          </div>
                          
                          {/* Formula */}
                          <div className="pt-2 mt-2 border-t border-gray-300">
                            <div className="flex justify-between items-center text-xs text-gray-500 mb-1">
                              <span>Formula:</span>
                              <span className="font-mono">
                                {currencySymbol}{selected.total_amount.toFixed(2)} - {currencySymbol}{commission.toFixed(2)} = {currencySymbol}{payout.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </>
                      )}
                      
                      {/* Total Payout */}
                      <div className="flex justify-between items-center pt-2 mt-2 border-t border-gray-300">
                        <span className="text-sm font-medium text-gray-700">Total Payout:</span>
                        <span className="text-xl font-bold text-green-600">
                          {currencySymbol}{payout.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })()}

              {/* Platform */}
              <div className="text-sm text-gray-500">
                Platform: {formatPlatformName(selected.booking_platform)}
              </div>

              {/* Email Status - Hidden for cleaners */}
              {!isReadOnly && (
                <EmailStatus booking={selected} showActions={true} />
              )}

              {(() => {
                const extractFromNotes = (pattern: RegExp): string | undefined => {
                  if (!selected?.notes) return undefined
                  const m = selected.notes.match(pattern)
                  return m && m[1] ? m[1].trim() : undefined
                }
                const derivedReservationUrl = selected.reservation_url || extractFromNotes(/Reservation\s*URL\s*:\s*(https?:\/\/[^\s]+)/i)
                const derivedPhoneLast4 = selected.guest_phone_last4 || extractFromNotes(/Last\s*4\s*Digits\)\s*:\s*(\d{4})/i)
                const derivedGuestInitials = (selected.guest_first_name || selected.guest_last_initial)
                  ? `${selected.guest_first_name || ''}${selected.guest_first_name && selected.guest_last_initial ? ' ' : ''}${selected.guest_last_initial ? selected.guest_last_initial + '.' : ''}`.trim()
                  : undefined
                const sanitizedNotes = (() => {
                  if (!selected?.notes) return undefined
                  const lines = selected.notes.split(/\r?\n/)
                  const filtered = lines.filter(line => {
                    const t = line.trim()
                    if (!t) return false
                    if (/^Reservation\s*URL\s*:/i.test(t)) return false
                    if (/https?:\/\/(?:www\.)?airbnb\.com\S*/i.test(t)) return false
                    if (/(phone|tel)[^\n]*last\s*4\s*digits/i.test(t)) return false
                    if (/last\s*4\s*digits\)\s*:\s*\d{4}/i.test(t)) return false
                    return true
                  })
                  const txt = filtered.join('\n').trim()
                  return txt.length > 0 ? txt : undefined
                })()

                const hasAny = selected.listing_name || derivedPhoneLast4 || derivedReservationUrl || derivedGuestInitials
                if (!hasAny && !sanitizedNotes) return null
                return (
                  <div className="mt-2 border-t pt-4">
                    {hasAny && (
                      <div className="space-y-1 text-sm text-gray-700 mb-4">
                        {selected.listing_name && (<div>Listing: {selected.listing_name}</div>)}
                        {derivedGuestInitials && (<div>Guest (from feed): {derivedGuestInitials}</div>)}
                        {!isReadOnly && derivedPhoneLast4 && (<div>Guest phone: ••••{derivedPhoneLast4}</div>)}
                        {!isReadOnly && derivedReservationUrl && (
                          <div>
                            <a
                              href={derivedReservationUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded"
                            >
                              Open Reservation
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                    {!isReadOnly && sanitizedNotes && (
                      <div>
                        <div className="text-gray-900 font-medium mb-1">Notes</div>
                        <div className="text-sm text-gray-700 whitespace-pre-line">{sanitizedNotes}</div>
                      </div>
                    )}
                  </div>
                )
              })()}
            </div>
            <div className="flex items-center justify-end space-x-3 mt-2 p-4 border-t border-gray-200">
              <button
                onClick={() => setSelected(null)}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium"
              >
                Close
              </button>
              {!isReadOnly && (
                <button
                  onClick={() => setShowBookingForm(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showBookingForm && selected && (
        <BookingForm
          booking={selected}
          propertyId={selected.property_id || propertyId}
          onSuccess={() => {
            setShowBookingForm(false)
            setSelected(null)
            refetch()
          }}
          onCancel={() => {
            setShowBookingForm(false)
          }}
        />
      )}

      {/* Email Logs Modal */}
      {showEmailLogs && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[2000]" onClick={() => setShowEmailLogs(false)}>
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  Emails Sent
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {emailLogs.length} email{emailLogs.length > 1 ? 's' : ''} sent for this booking
                  <br />
                  <span className="text-xs text-gray-400">
                    Includes cleaning emails to cleaners and template emails (check-in, checkout, thank you) to guests
                  </span>
                </p>
              </div>
              <button
                onClick={() => setShowEmailLogs(false)}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Filter and Search */}
              <div className="mb-4 space-y-3">
                <div className="flex items-center space-x-3">
                  <input
                    type="text"
                    placeholder="Search by recipient, subject..."
                    value={emailFilter}
                    onChange={(e) => setEmailFilter(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <select
                    value={emailTypeFilter}
                    onChange={(e) => setEmailTypeFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Types</option>
                    <option value="cleaning">Cleaning Emails</option>
                    <option value="check_in_instructions">Check-in Instructions</option>
                    <option value="checkout_reminder">Checkout Reminder</option>
                    <option value="thank_you_review">Thank You & Review</option>
                  </select>
                </div>
              </div>

              {/* Filtered Email Logs */}
              {(() => {
                const filtered = emailLogs.filter(log => {
                  const matchesSearch = !emailFilter || 
                    (log.recipient_name || log.cleaner_name || '').toLowerCase().includes(emailFilter.toLowerCase()) ||
                    (log.cleaner_email || '').toLowerCase().includes(emailFilter.toLowerCase()) ||
                    (log.subject || '').toLowerCase().includes(emailFilter.toLowerCase())
                  
                  const matchesType = emailTypeFilter === 'all' || 
                    (emailTypeFilter === 'cleaning' && (!log.email_type || log.email_type === 'cleaning')) ||
                    (log.email_type === emailTypeFilter)
                  
                  return matchesSearch && matchesType
                })

                if (filtered.length === 0) {
                  return (
                    <div className="text-center py-8 text-gray-500">
                      No emails found matching your filters.
                    </div>
                  )
                }

                return filtered.map((log, index) => (
                <div key={log.id} className="border border-gray-200 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        {log.status === 'sent' ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {log.recipient_name || log.cleaner_name || log.cleaner_email || 'Unknown recipient'}
                        </div>
                        {log.cleaner_email && (
                          <div className="text-sm text-gray-500">{emailToLink(log.cleaner_email)}</div>
                        )}
                        {log.email_type && log.email_type !== 'cleaning' ? (
                          <div className="text-xs text-blue-600 mt-1 font-medium">
                            📧 {log.email_type === 'check_in_instructions' ? 'Check-in Instructions' :
                             log.email_type === 'checkout_reminder' ? 'Checkout Reminder' :
                             log.email_type === 'thank_you_review' ? 'Thank You & Review' :
                             'Template Email'}
                          </div>
                        ) : (
                          <div className="text-xs text-gray-600 mt-1">
                            🧹 Cleaning Email
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex items-center space-x-2">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{log.subject}</div>
                        <div className="text-xs text-gray-500">
                          {format(new Date(log.sent_at), 'MMM dd, yyyy HH:mm')}
                        </div>
                      </div>
                      {!isReadOnly && (
                        <button
                          onClick={() => handleDeleteEmailLog(log.id)}
                          className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-full transition-colors"
                          title="Delete email log"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {log.status === 'sent' ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Sent
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        <XCircle className="h-3 w-3 mr-1" />
                        Failed
                      </span>
                    )}
                    {log.provider_message_id && (
                      <span className="text-xs text-gray-500">
                        ID: {log.provider_message_id.substring(0, 8)}...
                      </span>
                    )}
                  </div>

                  {log.error_message && (
                    <div className="bg-red-50 border border-red-200 rounded p-2">
                      <p className="text-sm text-red-700">{log.error_message}</p>
                    </div>
                  )}

                  {log.email_content && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                        View Email Content
                      </summary>
                      <div 
                        className="mt-2 p-3 bg-gray-50 rounded border border-gray-200 max-h-64 overflow-y-auto"
                        dangerouslySetInnerHTML={{ __html: log.email_content }}
                      />
                    </details>
                  )}

                  {index < filtered.length - 1 && (
                    <div className="border-t border-gray-200 pt-4 mt-4"></div>
                  )}
                </div>
              ))
              })()}
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowEmailLogs(false)}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

 