'use client'

import { useState } from 'react'
import { useBookings } from '@/hooks/use-bookings'
import { BookingWithProperty } from '@/lib/bookings'
import { format, addMonths, startOfMonth, endOfMonth, parseISO, isWithinInterval } from 'date-fns'
import { Calendar, Download, Printer } from 'lucide-react'

interface BookingsReportProps {
  startDate?: Date
}

export function BookingsReport({ startDate }: BookingsReportProps) {
  const [reportStartDate, setReportStartDate] = useState<Date>(startDate || new Date())
  
  // Calculate date range: 3 months from start date
  const reportEndDate = addMonths(reportStartDate, 3)
  const monthStart = startOfMonth(reportStartDate)
  const monthEnd = endOfMonth(reportEndDate)

  const { bookings, loading, error } = useBookings({
    date_from: monthStart,
    date_to: monthEnd,
    limit: 500 // Get all bookings for the period
  })

  // Filter bookings to only confirmed/checked_in status (exclude cancelled)
  // and ensure they overlap with the report period
  const activeBookings = bookings.filter(b => {
    if (b.status === 'cancelled') return false
    const checkIn = parseISO(b.check_in)
    const checkOut = parseISO(b.check_out)
    // Include if check-in or check-out is within the period, or if booking spans the period
    return (
      isWithinInterval(checkIn, { start: monthStart, end: monthEnd }) ||
      isWithinInterval(checkOut, { start: monthStart, end: monthEnd }) ||
      (checkIn <= monthStart && checkOut >= monthEnd)
    )
  })

  // Group bookings by month
  const bookingsByMonth = activeBookings.reduce((acc, booking) => {
    const checkIn = parseISO(booking.check_in)
    const checkOut = parseISO(booking.check_out)
    const monthKey = format(checkIn, 'yyyy-MM')
    
    if (!acc[monthKey]) {
      acc[monthKey] = []
    }
    acc[monthKey].push(booking)
    return acc
  }, {} as Record<string, BookingWithProperty[]>)

  // Sort bookings within each month by check-in date
  Object.keys(bookingsByMonth).forEach(month => {
    bookingsByMonth[month].sort((a, b) => 
      parseISO(a.check_in).getTime() - parseISO(b.check_in).getTime()
    )
  })

  const handlePrint = () => {
    window.print()
  }

  const handleDownload = () => {
    // Create a text version for download
    let reportText = `BOOKINGS REPORT\n`
    reportText += `Period: ${format(reportStartDate, 'MMMM yyyy')} - ${format(reportEndDate, 'MMMM yyyy')}\n`
    reportText += `Generated: ${format(new Date(), 'MMMM dd, yyyy HH:mm')}\n\n`

    Object.keys(bookingsByMonth).sort().forEach(month => {
      const monthDate = new Date(month + '-01')
      reportText += `\n${format(monthDate, 'MMMM yyyy').toUpperCase()}\n`
      reportText += `${'='.repeat(50)}\n\n`

      bookingsByMonth[month].forEach(booking => {
        const checkIn = format(parseISO(booking.check_in), 'MMM dd')
        const checkOut = format(parseISO(booking.check_out), 'MMM dd')
        reportText += `${checkIn} - ${checkOut}: ${booking.guest_name}`
        if (booking.property_name) {
          reportText += ` (${booking.property_name})`
        }
        reportText += `\n`
      })
    })

    const blob = new Blob([reportText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bookings-report-${format(reportStartDate, 'yyyy-MM')}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Report Header - Hidden when printing */}
      <div className="p-6 border-b border-gray-200 print:hidden">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            Bookings Report
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center"
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={format(reportStartDate, 'yyyy-MM-dd')}
              onChange={(e) => setReportStartDate(new Date(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Report Content */}
      <div className="p-6 print:p-4">
        {/* Report Title - Always visible */}
        <div className="mb-6 print:mb-4">
          <h2 className="text-2xl font-bold text-gray-900 print:text-xl">
            Bookings Report
          </h2>
          <p className="text-gray-600 mt-1 print:text-sm">
            {format(reportStartDate, 'MMMM yyyy')} - {format(reportEndDate, 'MMMM yyyy')}
          </p>
          <p className="text-sm text-gray-500 mt-1 print:hidden">
            Generated: {format(new Date(), 'MMMM dd, yyyy HH:mm')}
          </p>
        </div>

        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 mt-2">Loading bookings...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700">Error loading bookings: {error}</p>
          </div>
        )}

        {!loading && !error && (
          <>
            {Object.keys(bookingsByMonth).length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No bookings found for this period.</p>
              </div>
            ) : (
              <div className="space-y-8 print:space-y-6">
                {Object.keys(bookingsByMonth).sort().map(month => {
                  const monthDate = new Date(month + '-01')
                  return (
                    <div key={month} className="break-inside-avoid print:mb-4">
                      <h3 className="text-xl font-semibold text-gray-900 mb-4 print:text-lg print:mb-2 border-b border-gray-200 pb-2">
                        {format(monthDate, 'MMMM yyyy')}
                      </h3>
                      
                      <div className="space-y-3 print:space-y-2">
                        {bookingsByMonth[month].map(booking => {
                          const checkIn = parseISO(booking.check_in)
                          const checkOut = parseISO(booking.check_out)
                          return (
                            <div 
                              key={booking.id}
                              className="flex items-start justify-between py-2 border-b border-gray-100 print:py-1 print:border-gray-200"
                            >
                              <div className="flex-1">
                                <div className="font-medium text-gray-900 print:text-sm">
                                  {format(checkIn, 'MMM dd')} - {format(checkOut, 'MMM dd')}
                                </div>
                                <div className="text-gray-700 print:text-xs mt-1">
                                  <span className="font-semibold">{booking.guest_name}</span>
                                  {booking.property_name && (
                                    <span className="text-gray-500 ml-2">
                                      ({booking.property_name})
                                    </span>
                                  )}
                                </div>
                                {booking.contact_email && (
                                  <div className="text-xs text-gray-500 mt-1 print:hidden">
                                    {booking.contact_email}
                                  </div>
                                )}
                              </div>
                              <div className="text-right ml-4 print:ml-2">
                                <div className="text-sm font-medium text-gray-900 print:text-xs">
                                  {booking.nights} {booking.nights === 1 ? 'night' : 'nights'}
                                </div>
                                {booking.total_amount && (
                                  <div className="text-sm text-gray-600 print:text-xs print:hidden">
                                    ${booking.total_amount.toFixed(2)}
                                  </div>
                                )}
                                <div className="text-xs text-gray-500 mt-1 print:hidden">
                                  {booking.booking_platform}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

