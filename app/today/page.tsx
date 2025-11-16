'use client'

import { useEffect, useMemo, useState } from 'react'
import { DashboardHeader } from '@/components/dashboard/header'
import { HostOnlyRoute } from '@/components/auth/route-guard'
import { createClient } from '@/lib/supabase'
import { format, startOfDay, endOfDay, addDays } from 'date-fns'

type BookingRow = {
  id: string
  property_id: string
  property_name: string | null
  guest_name: string | null
  contact_email: string | null
  check_in: string
  check_out: string
}

type CleaningRow = {
  id: string
  property_id: string
  property_name: string | null
  property_address: string | null
  cleaning_date: string
  notes: string | null
  status: string
  cost: number | null
}

type EmailLogRow = {
  id: string
  status: string
  created_at: string
  subject: string | null
  cleaner_email: string | null
}

export default function TodayDashboardPage() {
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  const [todayCheckins, setTodayCheckins] = useState<BookingRow[]>([])
  const [tomorrowCheckouts, setTomorrowCheckouts] = useState<BookingRow[]>([])
  const [todaysCheckouts, setTodaysCheckouts] = useState<BookingRow[]>([])
  const [todayCleanings, setTodayCleanings] = useState<CleaningRow[]>([])
  const [failedEmails, setFailedEmails] = useState<EmailLogRow[]>([])

  const today = useMemo(() => new Date(), [])
  const todayStart = useMemo(() => startOfDay(today), [today])
  const todayEnd = useMemo(() => endOfDay(today), [today])
  const tomorrow = useMemo(() => addDays(today, 1), [today])
  const tomorrowStart = useMemo(() => startOfDay(tomorrow), [tomorrow])
  const tomorrowEnd = useMemo(() => endOfDay(tomorrow), [tomorrow])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const supabase = createClient()
        if (!supabase) throw new Error('Supabase client not available')

        // Parallel queries
        const [
          checkinsRes,
          checkoutsRes,
          todaysCheckoutsRes,
          cleaningsRes,
          failedRes
        ] = await Promise.all([
          supabase
            .from('bookings_with_properties')
            .select('id, property_id, property_name, guest_name, contact_email, check_in, check_out')
            .gte('check_in', todayStart.toISOString())
            .lte('check_in', todayEnd.toISOString())
            .order('check_in', { ascending: true }),
          supabase
            .from('bookings_with_properties')
            .select('id, property_id, property_name, guest_name, contact_email, check_in, check_out')
            .gte('check_out', tomorrowStart.toISOString())
            .lte('check_out', tomorrowEnd.toISOString())
            .order('check_out', { ascending: true }),
          supabase
            .from('bookings_with_properties')
            .select('id, property_id, property_name, guest_name, contact_email, check_in, check_out')
            .gte('check_out', todayStart.toISOString())
            .lte('check_out', todayEnd.toISOString())
            .order('check_out', { ascending: true }),
          supabase
            .from('cleanings_with_properties')
            .select('id, property_id, property_name, property_address, cleaning_date, notes, status, cost')
            .gte('cleaning_date', todayStart.toISOString())
            .lte('cleaning_date', todayEnd.toISOString())
            .order('cleaning_date', { ascending: true }),
          supabase
            .from('cleaning_email_logs')
            .select('id, status, created_at, subject, cleaner_email')
            .eq('status', 'failed')
            .gte('created_at', addDays(todayStart, -7).toISOString())
            .order('created_at', { ascending: false })
            .limit(20)
        ])

        if (checkinsRes.error) throw checkinsRes.error
        if (checkoutsRes.error) throw checkoutsRes.error
        if (todaysCheckoutsRes.error) throw todaysCheckoutsRes.error
        if (cleaningsRes.error) throw cleaningsRes.error
        if (failedRes.error) throw failedRes.error

        setTodayCheckins(checkinsRes.data || [])
        setTomorrowCheckouts(checkoutsRes.data || [])
        setTodaysCheckouts(todaysCheckoutsRes.data || [])
        setTodayCleanings(cleaningsRes.data || [])
        setFailedEmails(failedRes.data || [])
      } catch (e: any) {
        console.error('Today dashboard load error:', e)
        setError(e?.message || String(e))
      } finally {
        setLoading(false)
      }
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const sendGuestEmail = async (bookingId: string, type: 'check_in_instructions' | 'checkout_reminder' | 'thank_you_review') => {
    try {
      setSendingId(bookingId + '_' + type)
      setInfo(null)
      setError(null)
      const res = await fetch('/api/emails/send-now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_id: bookingId, email_type: type })
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data?.error || 'Failed to send email')
      } else {
        setInfo('Email sent')
      }
    } catch (e: any) {
      setError(e?.message || String(e))
    } finally {
      setSendingId(null)
    }
  }

  return (
    <HostOnlyRoute>
      <div className="min-h-screen bg-gray-50">
        <DashboardHeader />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Today</h2>
            <p className="text-gray-600 mt-1 text-sm">One-click actions for today and tomorrow</p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
          )}
          {info && (
            <div className="mb-4 p-3 rounded bg-green-50 border border-green-200 text-green-700 text-sm">{info}</div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Today's Check-ins */}
            <section className="bg-white rounded-lg border border-gray-200">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <div className="font-medium text-gray-900">Today’s Check-ins</div>
                <div className="text-xs text-gray-500">{format(today, 'EEE, MMM dd')}</div>
              </div>
              <div className="p-4">
                {loading ? (
                  <div className="text-gray-500 text-sm">Loading…</div>
                ) : todayCheckins.length === 0 ? (
                  <div className="text-gray-500 text-sm">No check-ins today</div>
                ) : (
                  <div className="space-y-3">
                    {todayCheckins.map(b => (
                      <div key={b.id} className="flex items-center justify-between p-3 rounded border border-gray-100">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">{b.property_name || 'Property'}</div>
                          <div className="text-xs text-gray-600 truncate">
                            {b.guest_name || 'Guest'} • Check-in {format(new Date(b.check_in), 'h:mm a')}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => sendGuestEmail(b.id, 'check_in_instructions')}
                            disabled={sendingId === b.id + '_check_in_instructions'}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs disabled:opacity-50"
                          >
                            {sendingId === b.id + '_check_in_instructions' ? 'Sending…' : 'Send Check-in'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* Tomorrow's Check-outs */}
            <section className="bg-white rounded-lg border border-gray-200">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <div className="font-medium text-gray-900">Tomorrow’s Check-outs</div>
                <div className="text-xs text-gray-500">{format(tomorrow, 'EEE, MMM dd')}</div>
              </div>
              <div className="p-4">
                {loading ? (
                  <div className="text-gray-500 text-sm">Loading…</div>
                ) : tomorrowCheckouts.length === 0 ? (
                  <div className="text-gray-500 text-sm">No check-outs tomorrow</div>
                ) : (
                  <div className="space-y-3">
                    {tomorrowCheckouts.map(b => (
                      <div key={b.id} className="flex items-center justify-between p-3 rounded border border-gray-100">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">{b.property_name || 'Property'}</div>
                          <div className="text-xs text-gray-600 truncate">
                            {b.guest_name || 'Guest'} • Check-out {format(new Date(b.check_out), 'h:mm a')}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => sendGuestEmail(b.id, 'checkout_reminder')}
                            disabled={sendingId === b.id + '_checkout_reminder'}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs disabled:opacity-50"
                          >
                            {sendingId === b.id + '_checkout_reminder' ? 'Sending…' : 'Send Checkout'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* Today's Check-outs (Thank You) */}
            <section className="bg-white rounded-lg border border-gray-200">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <div className="font-medium text-gray-900">Today’s Check-outs (Send Thank You)</div>
                <div className="text-xs text-gray-500">{format(today, 'EEE, MMM dd')}</div>
              </div>
              <div className="p-4">
                {loading ? (
                  <div className="text-gray-500 text-sm">Loading…</div>
                ) : todaysCheckouts.length === 0 ? (
                  <div className="text-gray-500 text-sm">No check-outs today</div>
                ) : (
                  <div className="space-y-3">
                    {todaysCheckouts.map(b => (
                      <div key={b.id} className="flex items-center justify-between p-3 rounded border border-gray-100">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">{b.property_name || 'Property'}</div>
                          <div className="text-xs text-gray-600 truncate">
                            {b.guest_name || 'Guest'} • Checked out {format(new Date(b.check_out), 'h:mm a')}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => sendGuestEmail(b.id, 'thank_you_review')}
                            disabled={sendingId === b.id + '_thank_you_review'}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs disabled:opacity-50"
                          >
                            {sendingId === b.id + '_thank_you_review' ? 'Sending…' : 'Send Thank You'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* Today's Cleanings */}
            <section className="bg-white rounded-lg border border-gray-200">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <div className="font-medium text-gray-900">Today’s Cleanings</div>
                <div className="text-xs text-gray-500">{format(today, 'EEE, MMM dd')}</div>
              </div>
              <div className="p-4">
                {loading ? (
                  <div className="text-gray-500 text-sm">Loading…</div>
                ) : todayCleanings.length === 0 ? (
                  <div className="text-gray-500 text-sm">No cleanings today</div>
                ) : (
                  <div className="space-y-3">
                    {todayCleanings.map(c => (
                      <div key={c.id} className="p-3 rounded border border-gray-100">
                        <div className="text-sm font-medium text-gray-900 truncate">{c.property_name || 'Property'}</div>
                        <div className="text-xs text-gray-600">
                          {format(new Date(c.cleaning_date), 'h:mm a')} • {c.property_address || 'Address N/A'}
                        </div>
                        {c.notes && (
                          <div className="text-xs text-gray-500 mt-1 line-clamp-2">Notes: {c.notes}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* Failed Emails (today) */}
            <section className="bg-white rounded-lg border border-gray-200">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <div className="font-medium text-gray-900">Failed Emails (Today)</div>
                <div className="text-xs text-gray-500">{failedEmails.length}</div>
              </div>
              <div className="p-4">
                {loading ? (
                  <div className="text-gray-500 text-sm">Loading…</div>
                ) : failedEmails.length === 0 ? (
                  <div className="text-gray-500 text-sm">No failed emails today</div>
                ) : (
                  <div className="space-y-3">
                    {failedEmails.slice(0, 5).map(e => (
                      <div key={e.id} className="p-3 rounded border border-gray-100">
                        <div className="text-sm text-gray-900 truncate">{e.subject || 'Email'}</div>
                        <div className="text-xs text-gray-600">
                          {format(new Date(e.created_at), 'h:mm a')} • {e.cleaner_email || 'N/A'}
                        </div>
                      </div>
                    ))}
                    {failedEmails.length > 5 && (
                      <div className="text-xs text-gray-500">+{failedEmails.length - 5} more</div>
                    )}
                  </div>
                )}
              </div>
            </section>
          </div>

          <div className="mt-8 text-xs text-gray-500">
            Tip: Use the Send Check-in / Send Checkout buttons for quick one-off sends. For batch sending to cleaners, go to “Send Cleaning Jobs”.
          </div>
        </main>
      </div>
    </HostOnlyRoute>
  )
}


