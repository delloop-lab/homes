'use client'

import { useState } from 'react'
import { useBookings } from '@/hooks/use-bookings'
import { BookingWithProperty } from '@/lib/bookings'
import { EmailStatus } from '@/components/bookings/email-status'
import { format } from 'date-fns'
import { MapPin, User, Calendar as CalendarIcon, Clock, Edit } from 'lucide-react'
import { BookingForm } from '@/components/bookings/booking-form'

interface BookingListProps {
  propertyId?: string
}

export function BookingList({ propertyId }: BookingListProps) {
  const { bookings, loading, error, refetch, loadMore, hasMore } = useBookings({
    property_id: propertyId,
    limit: 20,
    autoRefresh: true
  })
  const [selected, setSelected] = useState<BookingWithProperty | null>(null)
  const [showBookingForm, setShowBookingForm] = useState(false)

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
              <div>
                <div className="text-lg font-semibold text-gray-900">Booking details</div>
                <div className="text-sm text-gray-500">{selected.guest_name} • {selected.property_name}</div>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-500 hover:text-gray-700 text-sm">Close</button>
            </div>
            <div className="p-4 space-y-4">
              {/* Guest Info */}
              <div className="flex items-start space-x-3">
                <User className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <div className="font-medium text-gray-900">{selected.guest_name}</div>
                  {selected.contact_email && (
                    <div className="text-sm text-gray-500">{selected.contact_email}</div>
                  )}
                  {selected.contact_phone && (
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

              {/* Amount */}
              {selected.total_amount && (
                <div className="text-lg font-semibold text-gray-900">
                  ${selected.total_amount.toFixed(2)}
                </div>
              )}

              {/* Platform */}
              <div className="text-sm text-gray-500">
                Platform: {selected.booking_platform}
              </div>

              <EmailStatus booking={selected} showActions={true} />

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

                const hasAny = selected.listing_name || derivedPhoneLast4 || derivedReservationUrl || derivedGuestInitials || selected.event_uid
                if (!hasAny) return null
                return (
                  <div className="mt-2 border-t pt-4">
                    <div className="text-gray-900 font-medium mb-2">Platform details</div>
                    <div className="space-y-1 text-sm text-gray-700">
                      {selected.listing_name && (<div>Listing: {selected.listing_name}</div>)}
                      {derivedGuestInitials && (<div>Guest (from feed): {derivedGuestInitials}</div>)}
                      {derivedPhoneLast4 && (<div>Guest phone: ••••{derivedPhoneLast4}</div>)}
                      {selected.event_uid && (<div>Event UID: {selected.event_uid}</div>)}
                      {derivedReservationUrl && (
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
                    {sanitizedNotes && (
                      <div className="mt-4">
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
              <button
                onClick={() => setShowBookingForm(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </button>
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
    </div>
  )
}

 